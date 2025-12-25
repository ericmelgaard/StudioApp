/*
  # Add display_name to product_categories

  1. Changes
    - Add display_name column to product_categories table
    
  2. Notes
    - This column was in the original schema but missing from the actual table
    - Allows custom display names to override the original category name
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_categories' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN display_name text;
  END IF;
END $$;
