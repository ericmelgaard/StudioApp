/*
  # Create Placement Groups

  1. New Tables
    - `placement_groups`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Name of the placement group
      - `description` (text, nullable) - Optional description
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on placement_groups table
    - Operators and admins can read placement groups
    - Only admins can create/update/delete placement groups
*/

CREATE TABLE IF NOT EXISTS placement_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_placement_groups_name ON placement_groups(name);

ALTER TABLE placement_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators and admins can read placement groups"
  ON placement_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Admins can insert placement groups"
  ON placement_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update placement groups"
  ON placement_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete placement groups"
  ON placement_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE TRIGGER update_placement_groups_updated_at
  BEFORE UPDATE ON placement_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();