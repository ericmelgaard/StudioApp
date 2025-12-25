/*
  # Remove duplicate foreign key constraint

  1. Changes
    - Remove the duplicate fk_category constraint
    - Keep the standard product_category_assignments_category_id_fkey constraint
    
  2. Reason
    - Having multiple foreign keys on the same column causes PostgREST ambiguity errors
    - This prevents the API from resolving relationships properly
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_category'
    AND table_name = 'product_category_assignments'
  ) THEN
    ALTER TABLE product_category_assignments DROP CONSTRAINT fk_category;
  END IF;
END $$;
