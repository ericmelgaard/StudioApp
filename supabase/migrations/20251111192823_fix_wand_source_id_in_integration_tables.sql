/*
  # Fix wand_source_id in Integration Tables
  
  1. Problem
    - Existing records have NULL wand_source_id
    - Unique constraint doesn't work with NULL values
    - Need to populate wand_source_id from source_id or source_config_id
  
  2. Solution
    - Populate wand_source_id from existing source_id column
    - Recreate unique constraints to handle NULLs properly
    - Use NULLS NOT DISTINCT for Postgres 15+
*/

-- Update integration_modifiers: copy source_id to wand_source_id
UPDATE integration_modifiers 
SET wand_source_id = source_id
WHERE wand_source_id IS NULL AND source_id IS NOT NULL;

-- If source_id is also null, try to get it from the config
UPDATE integration_modifiers m
SET wand_source_id = c.wand_source_id
FROM integration_source_configs c
WHERE m.wand_source_id IS NULL 
  AND m.source_config_id = c.id
  AND c.wand_source_id IS NOT NULL;

-- Update integration_products: copy source_id to wand_source_id  
UPDATE integration_products 
SET wand_source_id = source_id
WHERE wand_source_id IS NULL AND source_id IS NOT NULL;

UPDATE integration_products p
SET wand_source_id = c.wand_source_id
FROM integration_source_configs c
WHERE p.wand_source_id IS NULL 
  AND p.source_config_id = c.id
  AND c.wand_source_id IS NOT NULL;

-- Update integration_discounts: copy source_id to wand_source_id
UPDATE integration_discounts 
SET wand_source_id = source_id
WHERE wand_source_id IS NULL AND source_id IS NOT NULL;

UPDATE integration_discounts d
SET wand_source_id = c.wand_source_id
FROM integration_source_configs c
WHERE d.wand_source_id IS NULL 
  AND d.source_config_id = c.id
  AND c.wand_source_id IS NOT NULL;

-- Drop and recreate the unique constraints with NULLS NOT DISTINCT
ALTER TABLE integration_modifiers 
DROP CONSTRAINT IF EXISTS integration_modifiers_source_external_path_unique;

ALTER TABLE integration_modifiers 
ADD CONSTRAINT integration_modifiers_source_external_path_unique 
UNIQUE NULLS NOT DISTINCT (wand_source_id, external_id, path_id);

-- Do the same for products (drop old, add new with NULLS NOT DISTINCT)
ALTER TABLE integration_products 
DROP CONSTRAINT IF EXISTS integration_products_wand_source_external_unique;

ALTER TABLE integration_products 
ADD CONSTRAINT integration_products_wand_source_external_unique 
UNIQUE NULLS NOT DISTINCT (wand_source_id, external_id);

-- And for discounts
ALTER TABLE integration_discounts 
DROP CONSTRAINT IF EXISTS integration_discounts_source_external_unique;

ALTER TABLE integration_discounts 
ADD CONSTRAINT integration_discounts_source_external_unique 
UNIQUE NULLS NOT DISTINCT (wand_source_id, external_id);
