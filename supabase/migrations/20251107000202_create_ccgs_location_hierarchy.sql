/*
  # Create CCGS Location Hierarchy Tables

  1. New Tables
    - `concepts` - Top-level concepts (brands/franchises)
      - `id` (bigint, primary key) - CCGS key for API calls
      - `name` (text) - Display name for UI
      - `privilege_level`, `parent_level`, `domain_level` - CCGS hierarchy metadata
      - `group_type_string` - CCGS group type
      - `parent_key` - Reference to parent in CCGS system
      - `created_at` (timestamptz) - Creation timestamp

    - `companies` - Companies under concepts
      - `id` (bigint, primary key) - CCGS key for API calls
      - `name` (text) - Display name for UI
      - `concept_id` (bigint) - Foreign key to concepts
      - `privilege_level`, `parent_level`, `domain_level` - CCGS hierarchy metadata
      - `group_type_string` - CCGS group type
      - `parent_key` - Reference to parent in CCGS system
      - `created_at` (timestamptz) - Creation timestamp

    - `stores` - Individual store locations
      - `id` (bigint, primary key) - CCGS key for API calls
      - `name` (text) - Display name for UI
      - `company_id` (bigint) - Foreign key to companies
      - `privilege_level`, `parent_level`, `domain_level` - CCGS hierarchy metadata
      - `group_type_string` - CCGS group type
      - `parent_key` - Reference to parent in CCGS system
      - `grand_parent_key` - Reference to grandparent in CCGS system
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on all tables
    - Allow public read/write access for demo purposes
    - All users (authenticated and anonymous) can view and insert data

  3. Indexes
    - Foreign key indexes for efficient joins
    - Company lookup by concept
    - Store lookup by company

  Notes:
    - IDs preserve CCGS keys for API compatibility
    - Names are used for UI display
    - Stores link directly to companies via company_id
    - Complete hierarchy: Concept → Company → Store
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_concept_id ON companies(concept_id);
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON stores(company_id);

-- Enable RLS
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for concepts
CREATE POLICY "Allow public read access to concepts"
  ON concepts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to concepts"
  ON concepts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to concepts"
  ON concepts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for companies
CREATE POLICY "Allow public read access to companies"
  ON companies FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to companies"
  ON companies FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to companies"
  ON companies FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for stores
CREATE POLICY "Allow public read access to stores"
  ON stores FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to stores"
  ON stores FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to stores"
  ON stores FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);