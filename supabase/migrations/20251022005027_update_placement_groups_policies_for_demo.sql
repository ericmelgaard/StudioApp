/*
  # Update Placement Groups RLS Policies for Demo Mode

  1. Changes
    - Drop existing restrictive policies that require authentication
    - Add new permissive policies that allow public access for demo purposes

  2. Security Notes
    - This is configured for demo/development purposes
    - In production, authentication should be required
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Operators and admins can read placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Operators and admins can insert placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Operators and admins can update placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Admins can delete placement groups" ON placement_groups;

-- Create new permissive policies for demo mode
CREATE POLICY "Anyone can read placement groups"
  ON placement_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert placement groups"
  ON placement_groups
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update placement groups"
  ON placement_groups
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete placement groups"
  ON placement_groups
  FOR DELETE
  USING (true);
