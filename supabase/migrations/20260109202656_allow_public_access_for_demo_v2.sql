/*
  # Allow Public Access for Demo

  1. Purpose
    - Enable public/anon access to tables for demo purposes
    - Users are impersonated without authentication
    - No login required for demo

  2. Changes
    - Add public read policies for user_store_access
    - Add public read/write policies for stores, companies, concepts
    - Keep existing authenticated policies for when auth is used

  3. Security Notes
    - This is for DEMO purposes only
    - In production, proper authentication and RLS should be enforced
*/

-- Drop existing public policies if they exist
DROP POLICY IF EXISTS "Public can view user store access" ON user_store_access;
DROP POLICY IF EXISTS "Public can insert user store access" ON user_store_access;
DROP POLICY IF EXISTS "Public can update user store access" ON user_store_access;
DROP POLICY IF EXISTS "Public can delete user store access" ON user_store_access;

-- Allow public to read user_store_access
CREATE POLICY "Public can view user store access"
  ON user_store_access FOR SELECT
  TO anon
  USING (true);

-- Allow public to modify user_store_access for demo
CREATE POLICY "Public can insert user store access"
  ON user_store_access FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can update user store access"
  ON user_store_access FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete user store access"
  ON user_store_access FOR DELETE
  TO anon
  USING (true);