/*
  # Update Label Positions RLS Policies for Demo Mode

  1. Changes
    - Drop existing restrictive policies that require authentication
    - Add new permissive policies that allow public access for demo purposes
    - Maintains the same policy structure but removes auth requirements

  2. Security Notes
    - This is configured for demo/development purposes
    - In production, authentication should be required
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Operators and admins can read label positions" ON label_positions;
DROP POLICY IF EXISTS "Operators and admins can insert label positions" ON label_positions;
DROP POLICY IF EXISTS "Operators and admins can update label positions" ON label_positions;
DROP POLICY IF EXISTS "Admins can delete label positions" ON label_positions;

-- Create new permissive policies for demo mode
CREATE POLICY "Anyone can read label positions"
  ON label_positions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert label positions"
  ON label_positions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update label positions"
  ON label_positions
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete label positions"
  ON label_positions
  FOR DELETE
  USING (true);
