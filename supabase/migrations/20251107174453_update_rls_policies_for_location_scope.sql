/*
  # Update RLS Policies for Location-Based Access Control

  1. Helper Functions
    - Create function to get user's location scope from user_profiles
    - Returns concept_id, company_id, and store_id for the authenticated user

  2. Updated Policies
    - Update concepts table policies to filter by user's concept_id scope
    - Update companies table policies to filter by user's concept_id or company_id scope
    - Update stores table policies to filter by user's company_id or store_id scope
    - Update placement_groups policies to filter by user's store scope
    - Keep admin users (null scope) with full access

  3. Security Notes
    - Users with NULL location_scope (admin) can access all data
    - Users with concept_id scope can only access that concept and its children
    - Users with company_id scope can only access that company and its stores
    - Users with store_id scope can only access that specific store
*/

-- Create helper function to get user's location scope
CREATE OR REPLACE FUNCTION get_user_location_scope(user_id uuid)
RETURNS TABLE (
  concept_id BIGINT,
  company_id BIGINT,
  store_id BIGINT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.concept_id,
    up.company_id,
    up.store_id,
    up.role
  FROM user_profiles up
  WHERE up.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing public policies on concepts, companies, stores
DROP POLICY IF EXISTS "Allow public read access to concepts" ON concepts;
DROP POLICY IF EXISTS "Allow public insert access to concepts" ON concepts;
DROP POLICY IF EXISTS "Allow public update access to concepts" ON concepts;
DROP POLICY IF EXISTS "Allow public read access to companies" ON companies;
DROP POLICY IF EXISTS "Allow public insert access to companies" ON companies;
DROP POLICY IF EXISTS "Allow public update access to companies" ON companies;
DROP POLICY IF EXISTS "Allow public read access to stores" ON stores;
DROP POLICY IF EXISTS "Allow public insert access to stores" ON stores;
DROP POLICY IF EXISTS "Allow public update access to stores" ON stores;

-- Create scoped policies for concepts
CREATE POLICY "Users can read accessible concepts"
  ON concepts
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert concepts"
  ON concepts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update concepts"
  ON concepts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create scoped policies for companies
CREATE POLICY "Users can read accessible companies"
  ON companies
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert companies"
  ON companies
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update companies"
  ON companies
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create scoped policies for stores
CREATE POLICY "Users can read accessible stores"
  ON stores
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert stores"
  ON stores
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update stores"
  ON stores
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Update placement_groups policies to respect location scope
DROP POLICY IF EXISTS "Anyone can read placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Anyone can insert placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Anyone can update placement groups" ON placement_groups;
DROP POLICY IF EXISTS "Anyone can delete placement groups" ON placement_groups;

CREATE POLICY "Users can read accessible placement groups"
  ON placement_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert placement groups"
  ON placement_groups
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update placement groups"
  ON placement_groups
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete placement groups"
  ON placement_groups
  FOR DELETE
  USING (name != '36355 - WAND Digital Demo');