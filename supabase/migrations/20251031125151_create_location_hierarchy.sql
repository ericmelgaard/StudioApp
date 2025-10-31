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

-- Create location_groups table
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

-- Create indexes
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
CREATE POLICY "Anyone can view concepts" ON concepts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can insert concepts" ON concepts FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Anyone can update concepts" ON concepts FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Policies for companies
CREATE POLICY "Anyone can view companies" ON companies FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can insert companies" ON companies FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Anyone can update companies" ON companies FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Policies for location_groups
CREATE POLICY "Anyone can view location groups" ON location_groups FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can insert location groups" ON location_groups FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Anyone can update location groups" ON location_groups FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Policies for stores
CREATE POLICY "Anyone can view stores" ON stores FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can insert stores" ON stores FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Anyone can update stores" ON stores FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);