/*
  # Allow Anonymous Access to User Profiles

  1. Changes
    - Add policy to allow anonymous users to read user_profiles
    - This enables the demo to work without Supabase Auth
*/

-- Allow anonymous users to read user profiles for demo purposes
CREATE POLICY "Allow anonymous read access to user profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);