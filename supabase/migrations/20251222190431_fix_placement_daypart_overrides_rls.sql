/*
  # Fix placement_daypart_overrides RLS policies
  
  1. Changes
    - Drop existing authenticated-only policies
    - Create new public policies matching placement_groups pattern
    
  2. Security
    - Allow public access to match other tables in the system
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view placement daypart overrides" ON placement_daypart_overrides;
DROP POLICY IF EXISTS "Users can insert placement daypart overrides" ON placement_daypart_overrides;
DROP POLICY IF EXISTS "Users can update placement daypart overrides" ON placement_daypart_overrides;
DROP POLICY IF EXISTS "Users can delete placement daypart overrides" ON placement_daypart_overrides;

-- Create new public policies
CREATE POLICY "Anyone can view placement daypart overrides"
  ON placement_daypart_overrides FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert placement daypart overrides"
  ON placement_daypart_overrides FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update placement daypart overrides"
  ON placement_daypart_overrides FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete placement daypart overrides"
  ON placement_daypart_overrides FOR DELETE
  TO public
  USING (true);
