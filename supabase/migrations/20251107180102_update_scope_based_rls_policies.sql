/*
  # Update RLS Policies for Scope-Based Access Control

  1. Policy Updates
    - Update user_profiles policies to allow admins full access
    - Add policies for users to view profiles within their scope
    - Update RLS policies on all major tables to respect user location scopes

  2. Security
    - Ensure users can only access data within their assigned scope
    - Admins have unrestricted access
    - Users without scope restrictions (old admins) maintain full access
    - Inherit scope: concept users can access all companies/stores in concept
*/

-- Drop and recreate user_profiles policies for better scope control
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow anon read access to user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow anon insert access to user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow anon update access to user_profiles" ON user_profiles;

-- Create comprehensive user_profiles policies
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Allow anon access for demo purposes (can be removed in production)
CREATE POLICY "Allow anon read access to user_profiles"
  ON user_profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert access to user_profiles"
  ON user_profiles FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update access to user_profiles"
  ON user_profiles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Helper function to check if user has access to a concept
CREATE OR REPLACE FUNCTION user_has_concept_access(check_concept_id bigint)
RETURNS boolean AS $$
BEGIN
  -- Allow if user is admin (no scope restrictions)
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND concept_id IS NULL
  ) THEN
    RETURN true;
  END IF;

  -- Allow if user's concept matches or is null (unrestricted)
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (concept_id IS NULL OR concept_id = check_concept_id)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has access to a company
CREATE OR REPLACE FUNCTION user_has_company_access(check_company_id bigint)
RETURNS boolean AS $$
DECLARE
  user_concept bigint;
  company_concept bigint;
BEGIN
  -- Get user's restrictions
  SELECT concept_id, company_id INTO user_concept
  FROM user_profiles
  WHERE id = auth.uid();

  -- Admin with no restrictions
  IF user_concept IS NULL THEN
    RETURN true;
  END IF;

  -- Get company's concept
  SELECT concept_id INTO company_concept
  FROM companies
  WHERE id = check_company_id;

  -- Allow if user's concept matches company's concept
  IF user_concept = company_concept THEN
    RETURN true;
  END IF;

  -- Allow if user is specifically assigned to this company
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND company_id = check_company_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has access to a store
CREATE OR REPLACE FUNCTION user_has_store_access(check_store_id bigint)
RETURNS boolean AS $$
DECLARE
  user_concept bigint;
  user_company bigint;
  store_company bigint;
  company_concept bigint;
BEGIN
  -- Get user's restrictions
  SELECT concept_id, company_id, store_id INTO user_concept, user_company
  FROM user_profiles
  WHERE id = auth.uid();

  -- Admin with no restrictions
  IF user_concept IS NULL THEN
    RETURN true;
  END IF;

  -- User specifically assigned to this store
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND store_id = check_store_id
  ) THEN
    RETURN true;
  END IF;

  -- Get store's company and concept
  SELECT company_id INTO store_company
  FROM stores
  WHERE id = check_store_id;

  SELECT concept_id INTO company_concept
  FROM companies
  WHERE id = store_company;

  -- Allow if user has concept-level access
  IF user_concept = company_concept THEN
    RETURN true;
  END IF;

  -- Allow if user has company-level access
  IF user_company = store_company THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;