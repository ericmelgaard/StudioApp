/*
  # Restructure Products Table to Use MRN as Primary Key

  1. Changes
    - Drop existing products table
    - Create new products table with MRN as primary key
    - Add meal_periods array to track which dayparts product appears in
    - Add meal_stations array to track which stations product appears in
    - Store first occurrence data as primary product info

  2. New Structure
    - Products are grouped by MRN
    - meal_periods: array of objects with {period: string, date: string}
    - meal_stations: array of objects with {station: string, station_detail: jsonb}
    - Single product record per MRN with arrays tracking all occurrences

  3. Security
    - Enable RLS with public access for demo
*/

-- Drop existing products table
DROP TABLE IF EXISTS products CASCADE;

-- Create new products table with MRN as primary key
CREATE TABLE IF NOT EXISTS products (
  mrn text PRIMARY KEY,
  external_id text,
  string_id text,
  name text NOT NULL,
  source_name text,
  description text,
  enticing_description text,
  portion text,
  calories text,
  price text,
  sort_order integer DEFAULT 0,
  is_combo boolean DEFAULT false,
  languages jsonb DEFAULT '{}'::jsonb,
  icons jsonb DEFAULT '[]'::jsonb,
  meal_periods jsonb DEFAULT '[]'::jsonb,
  meal_stations jsonb DEFAULT '[]'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_meal_periods ON products USING gin(meal_periods);
CREATE INDEX IF NOT EXISTS idx_products_meal_stations ON products USING gin(meal_stations);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (demo mode)
CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
