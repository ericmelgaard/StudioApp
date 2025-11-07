/*
  # Create CCGS Location Hierarchy for 11 Concepts Only

  Creates the concept/company/store hierarchy for the specified 11 concepts.
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

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  company_id bigint REFERENCES companies(id),
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 8,
  domain_level integer DEFAULT 16,
  group_type_string text DEFAULT '',
  parent_key bigint,
  grand_parent_key bigint,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_concept_id ON companies(concept_id);
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON stores(company_id);

-- Enable RLS
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to concepts" ON concepts;
DROP POLICY IF EXISTS "Allow public insert access to concepts" ON concepts;
DROP POLICY IF EXISTS "Allow public update access to concepts" ON concepts;
DROP POLICY IF EXISTS "Allow public read access to companies" ON companies;
DROP POLICY IF EXISTS "Allow public insert access to companies" ON companies;
DROP POLICY IF EXISTS "Allow public update access to companies" ON companies;
DROP POLICY IF EXISTS "Allow public read access to stores" ON stores;
DROP POLICY IF EXISTS "Allow public insert access to stores" ON stores;
DROP POLICY IF EXISTS "Allow public update access to stores" ON stores;

-- Create RLS policies
CREATE POLICY "Allow public read access to concepts" ON concepts FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert access to concepts" ON concepts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update access to concepts" ON concepts FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to companies" ON companies FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert access to companies" ON companies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update access to companies" ON companies FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to stores" ON stores FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert access to stores" ON stores FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update access to stores" ON stores FOR UPDATE TO public USING (true) WITH CHECK (true);
