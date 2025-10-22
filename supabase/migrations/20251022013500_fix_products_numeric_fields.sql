/*
  # Fix Products Table Numeric Fields

  1. Changes
    - Change `calories` from numeric to text (API returns values like "100+")
    - Change `price` from numeric to text (for consistency)

  2. Notes
    - Some API values contain non-numeric characters like "100+"
    - Store as text to preserve original formatting
*/

-- Change calories and price to text fields
ALTER TABLE products
  ALTER COLUMN calories TYPE text,
  ALTER COLUMN price TYPE text;
