/*
  # Fix Daypart Definitions RLS for No Authentication
  
  1. Changes
    - Drop all existing RLS policies that require authentication
    - Create new policies that allow public/anonymous access
    - Allow anyone to view, insert, update, and delete daypart definitions
  
  2. Security
    - Since this app has no authentication, all operations are public
    - RLS is still enabled but policies allow anonymous access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "All authenticated users can view active dayparts" ON daypart_definitions;
DROP POLICY IF EXISTS "Admin users can insert daypart definitions" ON daypart_definitions;
DROP POLICY IF EXISTS "Admin users can update daypart definitions" ON daypart_definitions;
DROP POLICY IF EXISTS "Admin users can delete daypart definitions" ON daypart_definitions;

-- Create new public policies
CREATE POLICY "Anyone can view daypart definitions"
  ON daypart_definitions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert daypart definitions"
  ON daypart_definitions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update daypart definitions"
  ON daypart_definitions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete daypart definitions"
  ON daypart_definitions FOR DELETE
  USING (true);
