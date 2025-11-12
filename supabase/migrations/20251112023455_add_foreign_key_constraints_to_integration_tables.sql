/*
  # Add Foreign Key Constraints to Integration Tables

  1. Changes
    - Add foreign key constraint from integration_products.wand_source_id to wand_integration_sources.id
    - Add foreign key constraint from integration_modifiers.wand_source_id to wand_integration_sources.id  
    - Add foreign key constraint from integration_discounts.wand_source_id to wand_integration_sources.id
    - These constraints ensure data integrity and enable proper JOIN operations

  2. Important Notes
    - Uses IF NOT EXISTS pattern to avoid errors if constraints already exist
    - Uses ON DELETE CASCADE so deleting an integration source removes related data
    - This fixes the 400 error in ProductManagement by establishing proper relationships
*/

-- Add foreign key constraint to integration_products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integration_products_wand_source_id_fkey'
    AND table_name = 'integration_products'
  ) THEN
    ALTER TABLE integration_products 
    ADD CONSTRAINT integration_products_wand_source_id_fkey 
    FOREIGN KEY (wand_source_id) 
    REFERENCES wand_integration_sources(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint to integration_modifiers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integration_modifiers_wand_source_id_fkey'
    AND table_name = 'integration_modifiers'
  ) THEN
    ALTER TABLE integration_modifiers 
    ADD CONSTRAINT integration_modifiers_wand_source_id_fkey 
    FOREIGN KEY (wand_source_id) 
    REFERENCES wand_integration_sources(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint to integration_discounts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integration_discounts_wand_source_id_fkey'
    AND table_name = 'integration_discounts'
  ) THEN
    ALTER TABLE integration_discounts 
    ADD CONSTRAINT integration_discounts_wand_source_id_fkey 
    FOREIGN KEY (wand_source_id) 
    REFERENCES wand_integration_sources(id) 
    ON DELETE CASCADE;
  END IF;
END $$;