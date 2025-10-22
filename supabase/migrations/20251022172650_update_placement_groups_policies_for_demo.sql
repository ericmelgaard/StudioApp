/*
  # Update Placement Groups Policies for Demo Mode

  1. Changes
    - Allow all authenticated users to read placement groups (for demo)
    - Allow all authenticated users to insert/update/delete placement groups (for demo)

  2. Security
    - This enables demo mode where any authenticated user can manage placement groups
    - In production, you would restrict this to specific roles
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Operators and admins can read placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Admins can insert placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Admins can update placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Admins can delete placement groups" ON placement_groups;

-- Create permissive policies for demo mode
CREATE POLICY "Anyone can read placement groups"
  ON placement_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert placement groups"
  ON placement_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update placement groups"
  ON placement_groups
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete placement groups"
  ON placement_groups
  FOR DELETE
  TO authenticated
  USING (name != '36355 - WAND Digital Demo');