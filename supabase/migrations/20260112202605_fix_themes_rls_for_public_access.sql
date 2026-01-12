/*
  # Fix Themes RLS for Public Access

  1. Changes
    - Drop existing restrictive RLS policies on themes table
    - Add public access policies to support demo mode
    - Match the pattern used in other tables (theme_boards, display_types, etc.)

  2. Security
    - Allows public INSERT, UPDATE, DELETE, and SELECT on themes
    - This enables demo functionality without authentication
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create themes in their concept" ON themes;
DROP POLICY IF EXISTS "Users can update themes in their concept" ON themes;
DROP POLICY IF EXISTS "Users can delete themes in their concept" ON themes;
DROP POLICY IF EXISTS "Allow theme access" ON themes;

-- Create public access policies for demo mode
CREATE POLICY "Allow public read access to themes"
  ON themes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to themes"
  ON themes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to themes"
  ON themes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to themes"
  ON themes FOR DELETE
  TO public
  USING (true);
