/*
  # Create Location Hierarchy Tables

  This migration creates the hierarchical location structure: Concept → Company → Group → Store
  
  ## New Tables
  
  ### `concepts`
  - `id` (bigint, primary key) - Maps to the key from source data
  - `name` (text) - Concept name
  - `privilege_level` (integer)
  - `parent_level` (integer)
  - `domain_level` (integer)
  - `group_type_string` (text)
  - `parent_key` (bigint) - Reference to parent
  - `created_at` (timestamptz)
  
  ### `companies`
  - `id` (bigint, primary key) - Maps to the key from source data
  - `name` (text) - Company name
  - `concept_id` (bigint) - Foreign key to concepts
  - `privilege_level` (integer)
  - `parent_level` (integer)
  - `domain_level` (integer)
  - `group_type_string` (text)
  - `parent_key` (bigint) - Reference to concept
  - `created_at` (timestamptz)
  
  ### `location_groups`
  - `id` (bigint, primary key) - Maps to the key from source data
  - `name` (text) - Group name
  - `company_id` (bigint) - Foreign key to companies
  - `privilege_level` (integer)
  - `parent_level` (integer)
  - `domain_level` (integer)
  - `group_type_string` (text)
  - `parent_key` (bigint) - Reference to company
  - `grand_parent_key` (bigint) - Reference to concept
  - `created_at` (timestamptz)
  
  ### `stores`
  - `id` (bigint, primary key) - Maps to the key from source data
  - `name` (text) - Store name
  - `location_group_id` (bigint) - Foreign key to location_groups
  - `privilege_level` (integer)
  - `parent_level` (integer)
  - `domain_level` (integer)
  - `group_type_string` (text)
  - `parent_key` (bigint) - Reference to group
  - `grand_parent_key` (bigint) - Reference to company
  - `created_at` (timestamptz)
  
  ## Security
  
  - Enable RLS on all tables
  - Add policies for authenticated users to read all location data
  - Restrict write operations to admin role only
*/

-- Create concepts table
CREATE TABLE IF NOT EXISTS concepts (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 1,
  domain_level integer DEFAULT 2,
  group_type_string text DEFAULT '',
  parent_key bigint,
  created_at timestamptz DEFAULT now()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  concept_id bigint REFERENCES concepts(id),
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 2,
  domain_level integer DEFAULT 4,
  group_type_string text DEFAULT '',
  parent_key bigint,
  created_at timestamptz DEFAULT now()
);

-- Create location_groups table (renamed from groups to avoid SQL keyword)
CREATE TABLE IF NOT EXISTS location_groups (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  company_id bigint REFERENCES companies(id),
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 4,
  domain_level integer DEFAULT 8,
  group_type_string text DEFAULT '',
  parent_key bigint,
  grand_parent_key bigint,
  created_at timestamptz DEFAULT now()
);

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  location_group_id bigint REFERENCES location_groups(id),
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 8,
  domain_level integer DEFAULT 16,
  group_type_string text DEFAULT '',
  parent_key bigint,
  grand_parent_key bigint,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_concept_id ON companies(concept_id);
CREATE INDEX IF NOT EXISTS idx_location_groups_company_id ON location_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_stores_location_group_id ON stores(location_group_id);
CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_location_groups_name ON location_groups(name);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);

-- Enable RLS
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Policies for concepts
CREATE POLICY "Anyone can view concepts"
  ON concepts FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can insert concepts"
  ON concepts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update concepts"
  ON concepts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for companies
CREATE POLICY "Anyone can view companies"
  ON companies FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for location_groups
CREATE POLICY "Anyone can view location groups"
  ON location_groups FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can insert location groups"
  ON location_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update location groups"
  ON location_groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for stores
CREATE POLICY "Anyone can view stores"
  ON stores FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can insert stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );