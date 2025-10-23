/*
  # Create Companies, Brands, and Sites Structure

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, company name)
      - `code` (text, unique company code)
      - `created_at` (timestamptz)
    
    - `brands` (concepts/brands like "Auntie Anne's")
      - `id` (uuid, primary key)
      - `name` (text, brand name)
      - `code` (text, unique brand code)
      - `created_at` (timestamptz)
    
    - `sites` (physical store locations)
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `brand_id` (uuid, foreign key to brands)
      - `name` (text, site/store name)
      - `code` (text, unique site code)
      - `address` (text, optional)
      - `city` (text, optional)
      - `state` (text, optional)
      - `zip_code` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated admin users
*/

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to brands"
  ON brands FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to companies"
  ON companies FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to sites"
  ON sites FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage brands"
  ON brands FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage companies"
  ON companies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sites"
  ON sites FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);