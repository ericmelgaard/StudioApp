/*
  # Add company_id to stores table

  1. Changes
    - Add `company_id` column to `stores` table to link stores directly to companies
    - Populate `company_id` from `grand_parent_key` which contains the company ID
    - Add index on `company_id` for query performance
  
  2. Notes
    - This allows stores to be queried directly by company without going through location_groups
    - The `location_group_id` field is preserved for data integrity but not required for navigation
    - Only stores with valid company references will have company_id populated
*/

-- Add company_id column to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS company_id bigint;

-- Populate company_id from grand_parent_key (which is the company ID in the hierarchy)
-- Only set company_id if the company exists
UPDATE stores 
SET company_id = grand_parent_key 
WHERE company_id IS NULL 
  AND grand_parent_key IN (SELECT id FROM companies);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON stores(company_id);