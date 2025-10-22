/*
  # Create Products Table

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `external_id` (text) - External product ID from API
      - `string_id` (text) - String ID from API
      - `mrn` (text) - Menu reference number
      - `name` (text) - Product name
      - `source_name` (text) - Source name from API
      - `description` (text) - Product description
      - `enticing_description` (text) - Marketing description
      - `portion` (text) - Portion size
      - `calories` (numeric) - Calorie count
      - `price` (numeric) - Product price
      - `meal_period` (text) - Breakfast, Lunch, Dinner, etc.
      - `meal_station` (text) - Station name (Grill, Salad Bar, etc.)
      - `sort_order` (integer) - Display sort order
      - `is_combo` (boolean) - Whether item is a combo
      - `date` (timestamptz) - Menu date
      - `languages` (jsonb) - Multilingual translations
      - `meal_station_detail` (jsonb) - Additional station details
      - `icons` (jsonb) - Product icons
      - `last_synced_at` (timestamptz) - Last sync from API
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Index on external_id for fast lookups
    - Index on meal_period for filtering
    - Index on meal_station for filtering
    - Index on date for date-based queries

  3. Security
    - Enable RLS on products table
    - Allow public read access for demo
    - Allow public write access for demo
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  string_id text,
  mrn text,
  name text NOT NULL,
  source_name text,
  description text,
  enticing_description text,
  portion text,
  calories numeric,
  price numeric,
  meal_period text,
  meal_station text,
  sort_order integer DEFAULT 0,
  is_combo boolean DEFAULT false,
  date timestamptz,
  languages jsonb DEFAULT '{}'::jsonb,
  meal_station_detail jsonb DEFAULT '{}'::jsonb,
  icons jsonb DEFAULT '[]'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_meal_period ON products(meal_period);
CREATE INDEX IF NOT EXISTS idx_products_meal_station ON products(meal_station);
CREATE INDEX IF NOT EXISTS idx_products_date ON products(date);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert products"
  ON products
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON products
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete products"
  ON products
  FOR DELETE
  USING (true);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
