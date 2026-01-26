/*
  # Add Hardware Device Activation System

  1. Changes to hardware_devices table
    - Add `activation_id` (text, unique) - Unique ID generated during activation
    - Add `client_version` (text) - Replace firmware tracking with client version
    - Add `activated_at` (timestamptz) - When the device was activated
    - Update status constraint to include 'activated' state

  2. Data Migration
    - Generate activation IDs for all existing hardware devices
    - Set client_version to '4.6.5' for all existing devices
    - Set activated_at to created_at for existing devices
    - Update status from 'available' to 'activated' for existing devices

  3. Security
    - RLS policies already allow public access
*/

-- Add new columns to hardware_devices
ALTER TABLE hardware_devices 
  ADD COLUMN IF NOT EXISTS activation_id text,
  ADD COLUMN IF NOT EXISTS client_version text DEFAULT '4.6.5',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Drop the existing status check constraint
ALTER TABLE hardware_devices 
  DROP CONSTRAINT IF EXISTS hardware_devices_status_check;

-- Add updated status check constraint with 'activated' option
ALTER TABLE hardware_devices 
  ADD CONSTRAINT hardware_devices_status_check 
  CHECK (status IN ('available', 'assigned', 'maintenance', 'retired', 'activated'));

-- Generate activation IDs for existing hardware devices
-- Format: HW-{random 8 chars}-{random 4 chars}
DO $$
DECLARE
  device_record RECORD;
  new_activation_id text;
BEGIN
  FOR device_record IN SELECT id FROM hardware_devices WHERE activation_id IS NULL
  LOOP
    -- Generate a unique activation ID
    LOOP
      new_activation_id := 'HW-' || upper(substring(md5(random()::text) from 1 for 8)) || '-' || upper(substring(md5(random()::text) from 1 for 4));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM hardware_devices WHERE activation_id = new_activation_id);
    END LOOP;
    
    UPDATE hardware_devices 
    SET 
      activation_id = new_activation_id,
      client_version = '4.6.5',
      activated_at = COALESCE(created_at, now()),
      status = CASE 
        WHEN status = 'available' THEN 'activated'
        ELSE status 
      END
    WHERE id = device_record.id;
  END LOOP;
END $$;

-- Add unique constraint on activation_id
ALTER TABLE hardware_devices 
  ADD CONSTRAINT hardware_devices_activation_id_unique 
  UNIQUE (activation_id);

-- Make activation_id NOT NULL after populating existing records
ALTER TABLE hardware_devices 
  ALTER COLUMN activation_id SET NOT NULL;

-- Create index on activation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_hardware_devices_activation_id 
  ON hardware_devices(activation_id);

-- Add comment to explain the activation_id
COMMENT ON COLUMN hardware_devices.activation_id IS 'Unique activation ID used to link hardware to media players. Generated during device activation.';
COMMENT ON COLUMN hardware_devices.client_version IS 'Client software version running on the device (e.g., 4.6.5)';
