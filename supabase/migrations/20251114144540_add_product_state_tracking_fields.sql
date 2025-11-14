/*
  # Add Product State Tracking Fields

  ## Overview
  This migration adds comprehensive product state tracking fields to support the unified
  API linking model with clear inheritance hierarchy and value resolution.

  ## Changes to `products` table

  ### Core Product Linking
  - Add `mapping_id` (text) - The external ID in the integration catalog (e.g., "toast-product-123")
  - Add `integration_source_id` (uuid) - Foreign key to wand_integration_sources
  - Add `integration_type` (text) - Type: 'product', 'modifier', or 'discount'
  - Add `parent_product_id` (uuid) - Foreign key to parent product for inheritance
  - Add `concept_id` (uuid) - Multi-tenancy: concept level
  - Add `company_id` (uuid) - Multi-tenancy: company level
  - Add `site_id` (uuid) - Multi-tenancy: site level

  ### Value Override System
  - Add `local_fields` (text[]) - Array of field names that are locally overridden
  - Add `price_calculations` (jsonb) - Calculated field formulas and results

  ### Sync Tracking
  - Add `last_synced_at` (timestamptz) - When product was last synced from API

  ## Indexes
  - Index on `mapping_id` for fast API lookup
  - Index on `integration_source_id` for filtering by source
  - Index on `parent_product_id` for inheritance queries
  - Composite index on (integration_source_id, mapping_id) for unique API links
  - Index on `concept_id`, `company_id`, `site_id` for multi-tenancy

  ## Foreign Keys
  - Link to `wand_integration_sources` table
  - Self-referencing link to parent product

  ## Notes
  - Options store their own link data in `attributes.options[].link`
  - Options inherit `integration_source_id` from parent product
  - API mapping is top-tier in value resolution hierarchy
  - Integration catalog has `mapping_id` field (not `external_id`)
*/

-- Add core linking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'mapping_id'
  ) THEN
    ALTER TABLE products ADD COLUMN mapping_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'integration_source_id'
  ) THEN
    ALTER TABLE products ADD COLUMN integration_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'integration_type'
  ) THEN
    ALTER TABLE products ADD COLUMN integration_type text;
  END IF;
END $$;

-- Add hierarchy fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'parent_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN parent_product_id uuid REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'concept_id'
  ) THEN
    ALTER TABLE products ADD COLUMN concept_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE products ADD COLUMN company_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE products ADD COLUMN site_id uuid;
  END IF;
END $$;

-- Add override system fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'local_fields'
  ) THEN
    ALTER TABLE products ADD COLUMN local_fields text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'price_calculations'
  ) THEN
    ALTER TABLE products ADD COLUMN price_calculations jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add sync tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE products ADD COLUMN last_synced_at timestamptz;
  END IF;
END $$;

-- Add constraint for integration_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'products' AND constraint_name = 'products_integration_type_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_integration_type_check 
      CHECK (integration_type IS NULL OR integration_type IN ('product', 'modifier', 'discount'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_mapping_id ON products(mapping_id);
CREATE INDEX IF NOT EXISTS idx_products_integration_source ON products(integration_source_id);
CREATE INDEX IF NOT EXISTS idx_products_parent ON products(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_products_source_mapping ON products(integration_source_id, mapping_id);
CREATE INDEX IF NOT EXISTS idx_products_concept ON products(concept_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_site ON products(site_id);

-- Add mapping_id to integration catalog tables if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_products' AND column_name = 'mapping_id'
  ) THEN
    ALTER TABLE integration_products ADD COLUMN mapping_id text;
    UPDATE integration_products SET mapping_id = external_id WHERE mapping_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_integration_products_mapping_id ON integration_products(mapping_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_modifiers' AND column_name = 'mapping_id'
  ) THEN
    ALTER TABLE integration_modifiers ADD COLUMN mapping_id text;
    UPDATE integration_modifiers SET mapping_id = external_id WHERE mapping_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_integration_modifiers_mapping_id ON integration_modifiers(mapping_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_discounts' AND column_name = 'mapping_id'
  ) THEN
    ALTER TABLE integration_discounts ADD COLUMN mapping_id text;
    UPDATE integration_discounts SET mapping_id = external_id WHERE mapping_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_integration_discounts_mapping_id ON integration_discounts(mapping_id);
  END IF;
END $$;
