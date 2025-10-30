/*
  # Add company_id to stores table

  Adds a company_id column to the stores table to support stores that belong directly to companies
  without a location_group.

  ## Changes
  - Add `company_id` column to stores table (nullable, foreign key to companies)
  - Make `location_group_id` nullable since stores can belong to either companies or location groups
  - Add index on company_id for performance
*/

-- Make location_group_id nullable since stores can belong directly to companies
ALTER TABLE stores ALTER COLUMN location_group_id DROP NOT NULL;

-- Add company_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE stores ADD COLUMN company_id bigint REFERENCES companies(id);
  END IF;
END $$;

-- Create index on company_id
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON stores(company_id);