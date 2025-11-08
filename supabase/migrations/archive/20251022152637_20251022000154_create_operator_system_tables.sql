/*
  # Operator System Tables

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `title` (text)
      - `message` (text)
      - `type` (text, enum: info/warning/error/success)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `system_status`
      - `id` (uuid, primary key)
      - `service_name` (text)
      - `status` (text, enum: operational/degraded/down)
      - `last_checked` (timestamptz)
      - `message` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `digital_signage`
      - `id` (uuid, primary key)
      - `name` (text)
      - `location` (text)
      - `status` (text, enum: online/offline/error)
      - `last_sync` (timestamptz)
      - `content_id` (text, nullable)
      - `created_by` (uuid, references user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `shelf_labels`
      - `id` (uuid, primary key)
      - `label_id` (text, unique)
      - `product_name` (text)
      - `price` (decimal)
      - `location` (text)
      - `status` (text, enum: synced/pending/error)
      - `last_updated` (timestamptz)
      - `created_by` (uuid, references user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Operators and admins can read/write their data
    - System status is readable by all authenticated users
    
  3. Notes
    - Notifications support different types for UI styling
    - System status tracks health of various services
    - Digital signage and shelf labels track operational devices
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create system_status table
CREATE TABLE IF NOT EXISTS system_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('operational', 'degraded', 'down')),
  last_checked timestamptz DEFAULT now(),
  message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create digital_signage table
CREATE TABLE IF NOT EXISTS digital_signage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  status text NOT NULL CHECK (status IN ('online', 'offline', 'error')),
  last_sync timestamptz DEFAULT now(),
  content_id text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shelf_labels table
CREATE TABLE IF NOT EXISTS shelf_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id text UNIQUE NOT NULL,
  product_name text NOT NULL,
  price decimal(10,2) NOT NULL,
  location text NOT NULL,
  status text NOT NULL CHECK (status IN ('synced', 'pending', 'error')),
  last_updated timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signage ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelf_labels ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System status policies (readable by all authenticated)
CREATE POLICY "Authenticated users can read system status"
  ON system_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system status"
  ON system_status
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Digital signage policies
CREATE POLICY "Operators and admins can read signage"
  ON digital_signage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can insert signage"
  ON digital_signage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can update signage"
  ON digital_signage
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Admins can delete signage"
  ON digital_signage
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Shelf labels policies
CREATE POLICY "Operators and admins can read shelf labels"
  ON shelf_labels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can insert shelf labels"
  ON shelf_labels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators and admins can update shelf labels"
  ON shelf_labels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Admins can delete shelf labels"
  ON shelf_labels
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
CREATE TRIGGER update_system_status_updated_at
  BEFORE UPDATE ON system_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_signage_updated_at
  BEFORE UPDATE ON digital_signage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shelf_labels_updated_at
  BEFORE UPDATE ON shelf_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();