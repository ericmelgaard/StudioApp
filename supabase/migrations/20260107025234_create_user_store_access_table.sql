/*
  # Create User Store Access System

  1. New Tables
    - `user_store_access`
      - Links users to specific stores they can access
      - `user_id` (uuid, references user_profiles)
      - `store_id` (bigint, references stores)
      - `created_at` (timestamp)
      - Primary key on (user_id, store_id)
  
  2. Security
    - Enable RLS on `user_store_access` table
    - Add policy for users to read their own store access
    - Add policy for admins to manage store access
  
  3. Changes
    - User access is now determined by entries in this table
    - Single user can have access to multiple stores
    - Removes reliance on company_id/concept_id for store access
*/

CREATE TABLE IF NOT EXISTS user_store_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id bigint NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

-- Enable RLS
ALTER TABLE user_store_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own store access
CREATE POLICY "Users can view own store access"
  ON user_store_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all store access
CREATE POLICY "Admins can view all store access"
  ON user_store_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can insert store access
CREATE POLICY "Admins can insert store access"
  ON user_store_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can delete store access
CREATE POLICY "Admins can delete store access"
  ON user_store_access
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_store_access_user_id ON user_store_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_store_access_store_id ON user_store_access(store_id);
