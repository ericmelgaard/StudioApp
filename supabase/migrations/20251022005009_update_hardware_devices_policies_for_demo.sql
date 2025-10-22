/*
  # Update Hardware Devices RLS Policies for Demo Mode

  1. Changes
    - Drop existing restrictive policies that require authentication
    - Add new permissive policies that allow public access for demo purposes
    - Maintains the same policy structure but removes auth requirements

  2. Security Notes
    - This is configured for demo/development purposes
    - In production, authentication should be required
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Operators and admins can read hardware devices" ON hardware_devices;
DROP POLICY IF EXISTS "Operators and admins can insert hardware devices" ON hardware_devices;
DROP POLICY IF EXISTS "Operators and admins can update hardware devices" ON hardware_devices;
DROP POLICY IF EXISTS "Admins can delete hardware devices" ON hardware_devices;

-- Create new permissive policies for demo mode
CREATE POLICY "Anyone can read hardware devices"
  ON hardware_devices
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert hardware devices"
  ON hardware_devices
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update hardware devices"
  ON hardware_devices
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete hardware devices"
  ON hardware_devices
  FOR DELETE
  USING (true);
