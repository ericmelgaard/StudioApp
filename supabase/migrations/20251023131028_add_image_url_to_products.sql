/*
  # Add image_url column to products table

  1. Changes
    - Add image_url column to products table for product images
  
  2. Notes
    - Optional field for storing product image URLs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;