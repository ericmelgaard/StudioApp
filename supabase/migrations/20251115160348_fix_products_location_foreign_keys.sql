/*
  # Fix products table location foreign keys

  1. Changes
    - Change concept_id from uuid to bigint to match concepts.id
    - Change company_id from uuid to bigint to match companies.id  
    - Change site_id from uuid to bigint to match stores.id
    - Add foreign key constraints to ensure referential integrity

  2. Notes
    - This assumes no existing data needs to be preserved in these columns
    - If data exists, it would need to be migrated separately
*/

-- Drop existing columns and recreate with correct types
ALTER TABLE products 
  DROP COLUMN IF EXISTS concept_id,
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS site_id;

-- Add columns with correct bigint type
ALTER TABLE products
  ADD COLUMN concept_id bigint REFERENCES concepts(id),
  ADD COLUMN company_id bigint REFERENCES companies(id),
  ADD COLUMN site_id bigint REFERENCES stores(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_concept_id ON products(concept_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_site_id ON products(site_id);
