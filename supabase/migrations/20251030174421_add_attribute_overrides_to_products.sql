/*
  # Add attribute override tracking to products

  1. Changes
    - Add `attribute_overrides` JSONB column to products table
      - Stores which attributes should NOT sync from integration
      - Format: {"attribute_name": true} for overridden attributes
    - Add index for efficient querying

  2. Purpose
    - Allow users to explicitly override specific integration attributes
    - Preserve local changes even when integration data updates
    - Enable reverting back to synced state by removing from overrides
*/

-- Add attribute_overrides column to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS attribute_overrides JSONB DEFAULT '{}'::jsonb;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_attribute_overrides
ON products USING gin (attribute_overrides);

-- Add comment for documentation
COMMENT ON COLUMN products.attribute_overrides IS 'Tracks which attributes are locally overridden and should not sync from integration';
