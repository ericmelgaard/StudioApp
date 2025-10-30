/*
  # Add product-level attribute mappings

  1. Changes
    - Add `attribute_mappings` column to products table to store custom field mappings per product
    - This allows dynamic linking of any unmapped attribute to integration fields at the product level

  2. Schema
    - `attribute_mappings` (jsonb): Stores mappings in format {"attribute_name": "integration.field.path"}

  3. Notes
    - Product-level mappings take precedence over template-level mappings
    - Allows flexibility for products that need custom integration field mappings
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