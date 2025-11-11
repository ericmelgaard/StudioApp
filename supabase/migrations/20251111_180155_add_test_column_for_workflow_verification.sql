/*
  # Add test column for workflow verification

  1. Changes
    - Add workflow_test_column to products table for testing new migration workflow

  2. Security
    - Maintains existing RLS policies
    - No data loss (additive changes only)
*/

-- Add test column to verify workflow
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS workflow_test_column text DEFAULT 'workflow_verified';

-- Add comment
COMMENT ON COLUMN products.workflow_test_column IS 'Test column to verify new migration workflow is working correctly';

