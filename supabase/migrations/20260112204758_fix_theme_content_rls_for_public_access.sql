/*
  # Fix Theme Content RLS for Public Access

  1. Changes
    - Drop existing restrictive RLS policies on theme_content table
    - Add public access policies to support demo mode
    - Match the pattern used in other theme-related tables

  2. Security
    - Allows public INSERT, UPDATE, DELETE, and SELECT on theme_content
    - This enables demo functionality without authentication
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view theme content" ON theme_content;
DROP POLICY IF EXISTS "Users can insert theme content" ON theme_content;
DROP POLICY IF EXISTS "Users can update theme content" ON theme_content;
DROP POLICY IF EXISTS "Users can delete theme content" ON theme_content;

-- Create public access policies for demo mode
CREATE POLICY "Allow public read access to theme content"
  ON theme_content FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to theme content"
  ON theme_content FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to theme content"
  ON theme_content FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to theme content"
  ON theme_content FOR DELETE
  TO public
  USING (true);
