/*
  # Add Missing Columns to Products Table

  ## Summary
  Adds the missing columns required for product import and attribute management functionality.
  The products table currently exists with basic fields but is missing the attribute-related columns
  that the application code expects for integration product imports.

  ## Changes

  ### 1. New Columns Added
    - `attributes` (jsonb) - Stores product attribute data (price, calories, description, etc.)
    - `attribute_mappings` (jsonb) - Maps product attributes to integration source fields for syncing
    - `attribute_overrides` (jsonb) - Tracks which attributes have been manually overridden
    - `attribute_template_id` (uuid) - Links to product attribute template for structure definition

  ### 2. Indexes
    - GIN index on attributes for efficient JSONB queries
    - B-tree index on attribute_template_id for foreign key lookups

  ## Purpose
  These columns enable:
  - Importing products from integration sources by category
  - Dynamic attribute resolution from integration data
  - Tracking manual overrides vs synced data
  - Flexible product attribute schemas via templates
*/

-- Add attributes column to store product data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attributes'
  ) THEN
    ALTER TABLE products ADD COLUMN attributes jsonb DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added attributes column to products table';
  ELSE
    RAISE NOTICE 'Column attributes already exists in products table';
  END IF;
END $$;

-- Add attribute_mappings column to track integration field mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attribute_mappings'
  ) THEN
    ALTER TABLE products ADD COLUMN attribute_mappings jsonb DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added attribute_mappings column to products table';
  ELSE
    RAISE NOTICE 'Column attribute_mappings already exists in products table';
  END IF;
END $$;

-- Add attribute_overrides column to track manual overrides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attribute_overrides'
  ) THEN
    ALTER TABLE products ADD COLUMN attribute_overrides jsonb DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added attribute_overrides column to products table';
  ELSE
    RAISE NOTICE 'Column attribute_overrides already exists in products table';
  END IF;
END $$;

-- Add attribute_template_id column to link to templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attribute_template_id'
  ) THEN
    ALTER TABLE products ADD COLUMN attribute_template_id uuid;
    RAISE NOTICE 'Added attribute_template_id column to products table';
  ELSE
    RAISE NOTICE 'Column attribute_template_id already exists in products table';
  END IF;
END $$;

-- Add display_template_id column if it doesn't exist (for completeness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'display_template_id'
  ) THEN
    ALTER TABLE products ADD COLUMN display_template_id uuid;
    RAISE NOTICE 'Added display_template_id column to products table';
  ELSE
    RAISE NOTICE 'Column display_template_id already exists in products table';
  END IF;
END $$;

-- Create GIN index on attributes for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);

-- Create index on attribute_template_id for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_products_attribute_template_id ON products(attribute_template_id);

-- Create index on display_template_id for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_products_display_template_id ON products(display_template_id);
