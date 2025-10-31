/*
  # Add attribute_mappings and attribute_overrides to products table

  1. Changes
    - Add `attribute_mappings` column to store product-level integration field mappings
    - Add `attribute_overrides` column to track which attributes are manually overridden
  
  2. Purpose
    - Support product-level attribute mappings that override template-level mappings
    - Track which attributes have been manually changed vs synced from integration
*/

-- Add attribute_mappings column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attribute_mappings'
  ) THEN
    ALTER TABLE products ADD COLUMN attribute_mappings jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add attribute_overrides column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attribute_overrides'
  ) THEN
    ALTER TABLE products ADD COLUMN attribute_overrides jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
