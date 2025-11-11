/*
  # Add integration_product_id column to products table

  1. Changes
    - Add `integration_product_id` column to products table
    - This column links products to integration_products for synced/mapped products
    - Make it nullable since not all products come from integrations
    - Add foreign key constraint to integration_products table
*/

-- Add integration_product_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'integration_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN integration_product_id uuid REFERENCES integration_products(id) ON DELETE SET NULL;
  END IF;
END $$;
