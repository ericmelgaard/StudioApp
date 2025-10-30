/*
  # Add attribute override tracking to products
*/

ALTER TABLE products
ADD COLUMN IF NOT EXISTS attribute_overrides JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_attribute_overrides
ON products USING gin (attribute_overrides);

COMMENT ON COLUMN products.attribute_overrides IS 'Tracks which attributes are locally overridden and should not sync from integration';