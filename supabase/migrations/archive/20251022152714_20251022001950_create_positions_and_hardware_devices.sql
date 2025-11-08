/*
  # Position-Based Shelf Label System

  1. New Tables
    - `hardware_devices`
      - `id` (uuid, primary key)
      - `device_id` (text, unique) - Physical device identifier
      - `device_type` (text) - Type of hardware (e.g., 'esl_2.9', 'esl_4.2')
      - `status` (text, enum: available/assigned/maintenance/retired)
      - `battery_level` (integer, nullable)
      - `last_seen` (timestamptz, nullable)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `label_positions`
      - `id` (uuid, primary key)
      - `position_id` (text, unique) - Logical position identifier
      - `product_name` (text)
      - `product_sku` (text, nullable)
      - `price` (decimal)
      - `location` (text) - Physical location (aisle, shelf, etc.)
      - `hardware_device_id` (uuid, nullable, references hardware_devices)
      - `status` (text, enum: active/pending/error/unassigned)
      - `display_template` (text, nullable) - Template for display layout
      - `last_synced` (timestamptz, nullable)
      - `created_by` (uuid, references user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes
    - Deprecate the old `shelf_labels` table (keep for reference)
    - New structure separates logical positions from physical devices
  
  3. Security
    - Enable RLS on both tables
    - Operators and admins can read/write positions
    - Operators and admins can read/write hardware devices
    
  4. Notes
    - Positions represent logical shelf locations
    - Hardware devices can be swapped without losing position data
    - Bulk assignment will match available devices to unassigned positions
    - Device status tracking for maintenance and inventory management
*/

-- Create hardware_devices table
CREATE TABLE IF NOT EXISTS hardware_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  device_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  battery_level integer CHECK (battery_level >= 0 AND battery_level <= 100),
  last_seen timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create label_positions table
CREATE TABLE IF NOT EXISTS label_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id text UNIQUE NOT NULL,
  product_name text NOT NULL,
  product_sku text,
  price decimal(10,2) NOT NULL,
  location text NOT NULL,
  hardware_device_id uuid REFERENCES hardware_devices(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('active', 'pending', 'error', 'unassigned')),
  display_template text,
  last_synced timestamptz,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hardware_devices_status ON hardware_devices(status);
CREATE INDEX IF NOT EXISTS idx_hardware_devices_device_type ON hardware_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_label_positions_status ON label_positions(status);
CREATE INDEX IF NOT EXISTS idx_label_positions_location ON label_positions(location);
CREATE INDEX IF NOT EXISTS idx_label_positions_hardware_device ON label_positions(hardware_device_id);

-- Enable RLS
ALTER TABLE hardware_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_positions ENABLE ROW LEVEL SECURITY;

-- Hardware devices policies
CREATE POLICY "Operators and admins can read hardware devices"
  ON hardware_devices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can insert hardware devices"
  ON hardware_devices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can update hardware devices"
  ON hardware_devices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Admins can delete hardware devices"
  ON hardware_devices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Label positions policies
CREATE POLICY "Operators and admins can read label positions"
  ON label_positions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can insert label positions"
  ON label_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can update label positions"
  ON label_positions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Admins can delete label positions"
  ON label_positions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Update triggers
CREATE TRIGGER update_hardware_devices_updated_at
  BEFORE UPDATE ON hardware_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_label_positions_updated_at
  BEFORE UPDATE ON label_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-assign available hardware to unassigned positions
CREATE OR REPLACE FUNCTION auto_assign_hardware_to_positions(
  p_position_ids uuid[] DEFAULT NULL,
  p_device_type text DEFAULT NULL
)
RETURNS TABLE (
  position_id uuid,
  device_id uuid,
  assigned boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH available_devices AS (
    SELECT hd.id, hd.device_type
    FROM hardware_devices hd
    WHERE hd.status = 'available'
      AND (p_device_type IS NULL OR hd.device_type = p_device_type)
    ORDER BY hd.created_at
  ),
  positions_to_assign AS (
    SELECT lp.id, lp.position_id
    FROM label_positions lp
    WHERE lp.hardware_device_id IS NULL
      AND lp.status = 'unassigned'
      AND (p_position_ids IS NULL OR lp.id = ANY(p_position_ids))
    ORDER BY lp.created_at
  ),
  assignments AS (
    SELECT 
      pta.id as pos_id,
      ad.id as dev_id,
      ROW_NUMBER() OVER (PARTITION BY pta.id ORDER BY ad.created_at) as pos_rank,
      ROW_NUMBER() OVER (PARTITION BY ad.id ORDER BY pta.created_at) as dev_rank
    FROM positions_to_assign pta
    CROSS JOIN available_devices ad
  ),
  valid_assignments AS (
    SELECT pos_id, dev_id
    FROM assignments
    WHERE pos_rank = 1 AND dev_rank = 1
  )
  UPDATE label_positions lp
  SET 
    hardware_device_id = va.dev_id,
    status = 'pending',
    updated_at = now()
  FROM valid_assignments va
  WHERE lp.id = va.pos_id
  RETURNING lp.id, va.dev_id, true;
  
  -- Update hardware device status
  UPDATE hardware_devices hd
  SET status = 'assigned', updated_at = now()
  WHERE hd.id IN (
    SELECT hardware_device_id 
    FROM label_positions 
    WHERE hardware_device_id IS NOT NULL 
    AND status != 'unassigned'
  );
END;
$$ LANGUAGE plpgsql;