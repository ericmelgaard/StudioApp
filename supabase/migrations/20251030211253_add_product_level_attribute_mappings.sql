/*
  # Add product-level attribute mappings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attribute_mappings'
  ) THEN
    ALTER TABLE products ADD COLUMN attribute_mappings jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;