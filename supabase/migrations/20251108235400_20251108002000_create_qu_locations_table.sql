/*
  # Create Qu Locations Table

  1. New Tables
    - `qu_locations`
      - `id` (integer, primary key) - Qu location ID from API
      - `name` (text) - Location name
      - `address_line1` (text) - Primary address line
      - `address_line2` (text) - Secondary address line (optional)
      - `city` (text) - City name
      - `state_code` (text) - State abbreviation (e.g., ID, CA)
      - `postal_code` (text) - ZIP/postal code
      - `country_code` (text) - Country code (e.g., US)
      - `phone` (text) - Phone number
      - `latitude` (numeric) - Geographic latitude
      - `longitude` (numeric) - Geographic longitude
      - `brand` (text) - Brand/concept identifier
      - `created_at` (timestamp) - Record creation time
      - `updated_at` (timestamp) - Last update time

  2. Security
    - Enable RLS on `qu_locations` table
    - Allow authenticated users to read all records
    - Allow authenticated users to insert/update records (for storing selections)

  3. Indexes
    - Index on id for fast lookups
    - Index on brand for filtering by concept
    - Index on name for search operations
*/

-- Create qu_locations table
CREATE TABLE IF NOT EXISTS qu_locations (
  id integer PRIMARY KEY,
  name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text DEFAULT '',
  city text NOT NULL,
  state_code text NOT NULL,
  postal_code text NOT NULL,
  country_code text NOT NULL DEFAULT 'US',
  phone text DEFAULT '',
  latitude numeric,
  longitude numeric,
  brand text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE qu_locations ENABLE ROW LEVEL SECURITY;

-- Allow all users to read qu_locations (public data from API)
CREATE POLICY "Allow public read access to qu_locations"
  ON qu_locations
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert locations
CREATE POLICY "Allow authenticated users to insert qu_locations"
  ON qu_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update locations
CREATE POLICY "Allow authenticated users to update qu_locations"
  ON qu_locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert locations (for demo mode)
CREATE POLICY "Allow anonymous users to insert qu_locations"
  ON qu_locations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update locations (for demo mode)
CREATE POLICY "Allow anonymous users to update qu_locations"
  ON qu_locations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qu_locations_brand ON qu_locations(brand);
CREATE INDEX IF NOT EXISTS idx_qu_locations_name ON qu_locations(name);
CREATE INDEX IF NOT EXISTS idx_qu_locations_city ON qu_locations(city);
