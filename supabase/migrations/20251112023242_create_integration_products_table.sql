/*
  # Create Integration Products Table

  1. New Tables
    - `integration_products`
      - `id` (uuid, primary key) - Unique identifier for each integration product
      - `wand_source_id` (uuid, foreign key) - Links to wand_integration_sources
      - `external_id` (text) - The product ID in the external system
      - `name` (text) - Product name from external system
      - `path_id` (text) - Hierarchical path/category in external system
      - `item_type` (text) - Type of item (e.g., "product", "menu_item", "modifier_group")
      - `data` (jsonb) - Raw product data from external system
      - `concept_id` (uuid) - Multi-tenancy: which concept this belongs to
      - `company_id` (uuid) - Multi-tenancy: which company this belongs to
      - `site_id` (uuid) - Multi-tenancy: which site this belongs to
      - `last_synced_at` (timestamptz) - When this data was last synced
      - `created_at` (timestamptz) - When this record was created
      - `updated_at` (timestamptz) - When this record was last updated

  2. Security
    - Enable RLS on `integration_products` table
    - Add policies for authenticated users to read and manage integration products

  3. Indexes
    - Index on `wand_source_id` for fast lookups by integration source
    - Index on `external_id` for fast lookups by external system ID
    - Composite index on (wand_source_id, external_id) for unique constraints
    - Index on `site_id` for multi-tenancy filtering
    - Index on `last_synced_at` for finding stale data

  4. Foreign Keys
    - Link to `wand_integration_sources` table
*/

CREATE TABLE IF NOT EXISTS integration_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text,
  path_id text,
  item_type text DEFAULT 'product',
  data jsonb DEFAULT '{}',
  concept_id uuid,
  company_id uuid,
  site_id uuid,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_products_source ON integration_products(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_external_id ON integration_products(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_source_external ON integration_products(wand_source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_site ON integration_products(site_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_synced ON integration_products(last_synced_at);

-- Enable RLS
ALTER TABLE integration_products ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view integration products"
  ON integration_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert integration products"
  ON integration_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update integration products"
  ON integration_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete integration products"
  ON integration_products
  FOR DELETE
  TO authenticated
  USING (true);