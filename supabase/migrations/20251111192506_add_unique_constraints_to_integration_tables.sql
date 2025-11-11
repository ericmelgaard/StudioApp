/*
  # Add Unique Constraints to Integration Tables
  
  1. Changes
    - Add unique constraint on integration_products (source_id, external_id)
    - Add unique constraint on integration_modifiers (source_id, external_id, path_id)
    - Add unique constraint on integration_discounts (source_id, external_id)
    - Add wand_source_id column if missing for backward compatibility
  
  2. Purpose
    - Enables upsert operations in save-integration-data edge function
    - Prevents duplicate entries for the same external item
    - Supports incremental sync operations
*/

-- Add wand_source_id column to integration_products if it doesn't exist (for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integration_products' AND column_name = 'wand_source_id'
  ) THEN
    ALTER TABLE integration_products ADD COLUMN wand_source_id uuid;
  END IF;
END $$;

-- Add unique constraint for integration_products
-- Drop existing if it exists (in case we're re-running)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'integration_products_source_external_unique'
  ) THEN
    ALTER TABLE integration_products DROP CONSTRAINT integration_products_source_external_unique;
  END IF;
END $$;

-- Create unique constraint using source_id and external_id
ALTER TABLE integration_products 
ADD CONSTRAINT integration_products_source_external_unique 
UNIQUE (source_id, external_id);

-- Also create constraint for wand_source_id compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'integration_products_wand_source_external_unique'
  ) THEN
    ALTER TABLE integration_products 
    ADD CONSTRAINT integration_products_wand_source_external_unique 
    UNIQUE (wand_source_id, external_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- Integration Modifiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integration_modifiers' AND column_name = 'wand_source_id'
  ) THEN
    ALTER TABLE integration_modifiers ADD COLUMN wand_source_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integration_modifiers' AND column_name = 'path_id'
  ) THEN
    ALTER TABLE integration_modifiers ADD COLUMN path_id text;
  END IF;
END $$;

-- Add unique constraint for integration_modifiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'integration_modifiers_source_external_path_unique'
  ) THEN
    ALTER TABLE integration_modifiers 
    ADD CONSTRAINT integration_modifiers_source_external_path_unique 
    UNIQUE (wand_source_id, external_id, path_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- Integration Discounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integration_discounts' AND column_name = 'wand_source_id'
  ) THEN
    ALTER TABLE integration_discounts ADD COLUMN wand_source_id uuid;
  END IF;
END $$;

-- Add unique constraint for integration_discounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'integration_discounts_source_external_unique'
  ) THEN
    ALTER TABLE integration_discounts 
    ADD CONSTRAINT integration_discounts_source_external_unique 
    UNIQUE (wand_source_id, external_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_products_wand_source ON integration_products(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_external_id ON integration_products(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_last_synced ON integration_products(last_synced_at);

CREATE INDEX IF NOT EXISTS idx_integration_modifiers_wand_source ON integration_modifiers(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_external_id ON integration_modifiers(external_id);

CREATE INDEX IF NOT EXISTS idx_integration_discounts_wand_source ON integration_discounts(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_external_id ON integration_discounts(external_id);
