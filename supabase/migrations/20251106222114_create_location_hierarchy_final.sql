/*
  # Create Location Hierarchy Tables

  1. New Tables
    - `concepts` - Top-level concepts (brands/franchises)
      - `id` (bigint, primary key) - Unique identifier from CCGS
      - `name` (text) - Concept name
      - `privilege_level`, `parent_level`, `domain_level` - CCGS hierarchy metadata
      - `group_type_string` - CCGS group type
      - `parent_key` - Reference to parent in CCGS system
      - `created_at` (timestamptz) - Creation timestamp

    - `companies` - Companies under concepts
      - `id` (bigint, primary key) - Unique identifier from CCGS
      - `name` (text) - Company name
      - `concept_id` (bigint) - Foreign key to concepts
      - `privilege_level`, `parent_level`, `domain_level` - CCGS hierarchy metadata
      - `group_type_string` - CCGS group type
      - `parent_key` - Reference to parent in CCGS system
      - `created_at` (timestamptz) - Creation timestamp

    - `stores` - Individual store locations
      - `id` (bigint, primary key) - Unique identifier from CCGS
      - `name` (text) - Store name
      - `company_id` (bigint) - Foreign key to companies (NOT NULL after migration)
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
    - Groups are excluded from this hierarchy
    - Stores link directly to companies via company_id
    - IDs are preserved from CCGS system for data integrity
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

-- Enable RLS on all tables
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for concepts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepts' AND policyname = 'Anyone can view concepts') THEN
    CREATE POLICY "Anyone can view concepts" ON concepts FOR SELECT TO authenticated, anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepts' AND policyname = 'Anyone can insert concepts') THEN
    CREATE POLICY "Anyone can insert concepts" ON concepts FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepts' AND policyname = 'Anyone can update concepts') THEN
    CREATE POLICY "Anyone can update concepts" ON concepts FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create RLS policies for companies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can view companies') THEN
    CREATE POLICY "Anyone can view companies" ON companies FOR SELECT TO authenticated, anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can insert companies') THEN
    CREATE POLICY "Anyone can insert companies" ON companies FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can update companies') THEN
    CREATE POLICY "Anyone can update companies" ON companies FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create RLS policies for stores
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can view stores') THEN
    CREATE POLICY "Anyone can view stores" ON stores FOR SELECT TO authenticated, anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can insert stores') THEN
    CREATE POLICY "Anyone can insert stores" ON stores FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can update stores') THEN
    CREATE POLICY "Anyone can update stores" ON stores FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;