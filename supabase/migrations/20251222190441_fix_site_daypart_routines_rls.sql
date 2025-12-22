/*
  # Fix site_daypart_routines RLS policies
  
  1. Changes
    - Drop existing authenticated-only policies
    - Create new public policies matching placement_groups pattern
    
  2. Security
    - Allow public access to match other tables in the system
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view site daypart routines" ON site_daypart_routines;
DROP POLICY IF EXISTS "Users can insert site daypart routines" ON site_daypart_routines;
DROP POLICY IF EXISTS "Users can update site daypart routines" ON site_daypart_routines;
DROP POLICY IF EXISTS "Users can delete site daypart routines" ON site_daypart_routines;

-- Create new public policies
CREATE POLICY "Anyone can view site daypart routines"
  ON site_daypart_routines FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert site daypart routines"
  ON site_daypart_routines FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update site daypart routines"
  ON site_daypart_routines FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete site daypart routines"
  ON site_daypart_routines FOR DELETE
  TO public
  USING (true);
