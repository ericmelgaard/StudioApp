/*
  # Allow Anonymous Access to Placement Groups for Demo

  1. Changes
    - Allow anonymous users to read placement groups
    - This enables demo mode without requiring authentication

  2. Security Note
    - This is for demo purposes only
    - In production, you would require authentication
*/

-- Add policy for anonymous read access
CREATE POLICY "Anonymous can read placement groups"
  ON placement_groups
  FOR SELECT
  TO anon
  USING (true);

-- Add policy for anonymous write access (for demo)
CREATE POLICY "Anonymous can insert placement groups"
  ON placement_groups
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous can update placement groups"
  ON placement_groups
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous can delete placement groups"
  ON placement_groups
  FOR DELETE
  TO anon
  USING (name != '36355 - WAND Digital Demo');