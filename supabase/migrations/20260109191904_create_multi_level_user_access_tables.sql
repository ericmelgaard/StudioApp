/*
  # Create Multi-Level User Access System

  ## Overview
  This migration creates a flexible multi-level access control system that allows
  users to be granted access at concept, company, or store levels.

  ## New Tables
  
  ### `user_concept_access`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key to auth.users) - The user being granted access
  - `concept_id` (bigint, foreign key to concepts) - The concept they can access
  - `created_at` (timestamptz) - When access was granted
  - `created_by` (uuid, foreign key to auth.users) - Who granted the access
  
  ### `user_company_access`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key to auth.users) - The user being granted access
  - `company_id` (bigint, foreign key to companies) - The company they can access
  - `created_at` (timestamptz) - When access was granted
  - `created_by` (uuid, foreign key to auth.users) - Who granted the access

  ## Security
  - Enable RLS on all new tables
  - Admin users can manage all access grants
  - Users cannot modify their own access
  - Access grants are viewable by authenticated users for display purposes

  ## Indexes
  - Add indexes on foreign keys for query performance
  - Add composite indexes for common access check queries

  ## Notes
  - The existing `user_store_access` table continues to work for store-level grants
  - Multiple access levels can coexist (e.g., concept access + specific store overrides)
  - Access is hierarchical: concept access implies all companies/stores within
*/

-- Create user_concept_access table
CREATE TABLE IF NOT EXISTS user_concept_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id bigint NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, concept_id)
);

-- Create user_company_access table
CREATE TABLE IF NOT EXISTS user_company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id bigint NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE user_concept_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_concept_access

-- Admins can view all concept access grants
CREATE POLICY "Admins can view all concept access"
  ON user_concept_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can insert concept access grants
CREATE POLICY "Admins can insert concept access"
  ON user_concept_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can delete concept access grants
CREATE POLICY "Admins can delete concept access"
  ON user_concept_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for user_company_access

-- Admins can view all company access grants
CREATE POLICY "Admins can view all company access"
  ON user_company_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can insert company access grants
CREATE POLICY "Admins can insert company access"
  ON user_company_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can delete company access grants
CREATE POLICY "Admins can delete company access"
  ON user_company_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_concept_access_user_id ON user_concept_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_access_concept_id ON user_concept_access(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_company_access_user_id ON user_company_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_access_company_id ON user_company_access(company_id);

-- Create a helper function to check if a user has access to a store through any level
CREATE OR REPLACE FUNCTION user_has_store_access(check_user_id uuid, check_store_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check direct store access
  IF EXISTS (
    SELECT 1 FROM user_store_access
    WHERE user_id = check_user_id
    AND store_id = check_store_id
  ) THEN
    RETURN true;
  END IF;

  -- Check company-level access
  IF EXISTS (
    SELECT 1 FROM user_company_access uca
    JOIN stores s ON s.company_id = uca.company_id
    WHERE uca.user_id = check_user_id
    AND s.id = check_store_id
  ) THEN
    RETURN true;
  END IF;

  -- Check concept-level access
  IF EXISTS (
    SELECT 1 FROM user_concept_access uca
    JOIN companies c ON c.concept_id = uca.concept_id
    JOIN stores s ON s.company_id = c.id
    WHERE uca.user_id = check_user_id
    AND s.id = check_store_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;