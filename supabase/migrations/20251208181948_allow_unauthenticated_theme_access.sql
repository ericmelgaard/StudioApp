/*
  # Allow Unauthenticated Theme Access

  1. Changes
    - Update SELECT policy to allow access without authentication
    - This enables the app to work without Supabase Auth
    
  2. Security
    - Allows public read access to themes
    - Write operations still protected by other policies
*/

DROP POLICY IF EXISTS "Users can view themes in their concept hierarchy" ON themes;

CREATE POLICY "Allow theme access"
  ON themes FOR SELECT
  USING (true);
