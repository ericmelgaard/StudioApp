/*
  # Add Public Access to Display Types

  ## Overview
  This migration updates the display_types table to allow unauthenticated public access,
  matching the access pattern used by other tables in the system.

  ## Changes
  - Drop existing authenticated-only policies on display_types
  - Add new public access policies allowing all operations without authentication

  ## Security
  - Maintains RLS enabled on display_types table
  - Allows full public access for read and write operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view display types" ON display_types;
DROP POLICY IF EXISTS "Users can insert display types" ON display_types;
DROP POLICY IF EXISTS "Users can update display types" ON display_types;
DROP POLICY IF EXISTS "Users can delete display types" ON display_types;

-- Create public access policy
CREATE POLICY "Allow public access to display_types"
  ON display_types FOR ALL
  USING (true)
  WITH CHECK (true);
