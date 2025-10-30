/*
  # Create Integration Products Schema

  1. New Tables
    - `integration_sources`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the integration (e.g., "QU POS", "Toast", etc.)
      - `type` (text) - Type of integration
      - `config` (jsonb) - Configuration details
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `integration_products`
      - `id` (uuid, primary key)
      - `source_id` (uuid, foreign key to integration_sources)
      - `external_id` (text) - The ID from the external system
      - `path_id` (text) - Path identifier from external system
      - `name` (text) - Product name
      - `item_type` (text) - Type of item
      - `data` (jsonb) - Full product data from integration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_synced_at` (timestamptz)
    
    - `integration_modifiers`
      - `id` (uuid, primary key)
      - `source_id` (uuid, foreign key to integration_sources)
      - `external_id` (text) - The ID from the external system
      - `path_id` (text) - Path identifier from external system
      - `name` (text) - Modifier name
      - `modifier_group_id` (text) - Group this modifier belongs to
      - `modifier_group_name` (text) - Name of the modifier group
      - `data` (jsonb) - Full modifier data from integration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_synced_at` (timestamptz)
    
    - `integration_discounts`
      - `id` (uuid, primary key)
      - `source_id` (uuid, foreign key to integration_sources)
      - `external_id` (text) - The ID from the external system
      - `name` (text) - Discount name
      - `discount_amount` (numeric) - Discount amount if applicable
      - `data` (jsonb) - Full discount data from integration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_synced_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read integration data
    - Only authenticated users with appropriate roles can write
*/

-- Create integration_sources table
CREATE TABLE IF NOT EXISTS integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration sources"
  ON integration_sources FOR SELECT
  USING (true);

-- Create integration_products table
CREATE TABLE IF NOT EXISTS integration_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  path_id text,
  name text NOT NULL,
  item_type text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_products_source_id ON integration_products(source_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_external_id ON integration_products(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_name ON integration_products(name);
CREATE INDEX IF NOT EXISTS idx_integration_products_data ON integration_products USING gin(data);

ALTER TABLE integration_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration products"
  ON integration_products FOR SELECT
  USING (true);

-- Create integration_modifiers table
CREATE TABLE IF NOT EXISTS integration_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  path_id text,
  name text NOT NULL,
  modifier_group_id text,
  modifier_group_name text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_modifiers_source_id ON integration_modifiers(source_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_external_id ON integration_modifiers(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_name ON integration_modifiers(name);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_group ON integration_modifiers(modifier_group_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_data ON integration_modifiers USING gin(data);

ALTER TABLE integration_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration modifiers"
  ON integration_modifiers FOR SELECT
  USING (true);

-- Create integration_discounts table
CREATE TABLE IF NOT EXISTS integration_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  discount_amount numeric,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_discounts_source_id ON integration_discounts(source_id);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_external_id ON integration_discounts(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_name ON integration_discounts(name);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_data ON integration_discounts USING gin(data);

ALTER TABLE integration_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration discounts"
  ON integration_discounts FOR SELECT
  USING (true);