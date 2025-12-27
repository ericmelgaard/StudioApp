/*
  # Add unit_of_measure column and new data types to available_attributes

  1. Changes
    - Add `unit_of_measure` column (nullable text) to available_attributes table
    - Update type constraint to include 'price' and 'calories' data types
    - Existing data types: 'text', 'richtext', 'number', 'boolean', 'image', 'sizes'
    - New data types: 'price', 'calories'

  2. Notes
    - unit_of_measure is optional and can be used for number, price, and calories types
    - For price type, unit_of_measure typically defaults to "$" or currency symbol
    - For calories type, unit_of_measure typically defaults to "kcal"
    - For number type, can be kg, g, mL, L, oz, etc.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'available_attributes' AND column_name = 'unit_of_measure'
  ) THEN
    ALTER TABLE available_attributes ADD COLUMN unit_of_measure text;
  END IF;
END $$;

ALTER TABLE available_attributes 
  DROP CONSTRAINT IF EXISTS available_attributes_type_check;

ALTER TABLE available_attributes 
  ADD CONSTRAINT available_attributes_type_check 
  CHECK (type IN ('text', 'richtext', 'number', 'boolean', 'image', 'sizes', 'price', 'calories'));