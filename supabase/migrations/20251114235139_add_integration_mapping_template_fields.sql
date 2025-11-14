/*
  # Add Template Support to Integration Attribute Mappings

  1. Changes
    - Add `is_template` boolean to distinguish template mappings from instance mappings
    - Add `attribute_mappings` jsonb to store the actual field mappings
    - Add `template_name` text for display purposes
    - Add `application_level` text to indicate scope (concept/company/store)
    - Add `concept_id` for concept-level mappings
    - Add `company_id` for company-level mappings
    - Add `store_id` for store-level mappings
    - Add `is_inherited` boolean to track if mapping is inherited from parent level
    - Add `parent_mapping_id` to reference inherited mappings

  2. Notes
    - Preserves existing `field_mappings` column for backward compatibility
    - `attribute_mappings` has structure: { mappings: [{ integration_field, wand_field, transform }] }
*/

-- Add new columns to support template mappings
ALTER TABLE integration_attribute_mappings 
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attribute_mappings jsonb,
  ADD COLUMN IF NOT EXISTS template_name text,
  ADD COLUMN IF NOT EXISTS application_level text,
  ADD COLUMN IF NOT EXISTS concept_id integer,
  ADD COLUMN IF NOT EXISTS company_id integer,
  ADD COLUMN IF NOT EXISTS store_id integer,
  ADD COLUMN IF NOT EXISTS is_inherited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_mapping_id uuid;

-- Add foreign key constraints
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'concepts') THEN
    ALTER TABLE integration_attribute_mappings
      ADD CONSTRAINT fk_concept 
        FOREIGN KEY (concept_id) 
        REFERENCES concepts(id) 
        ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    ALTER TABLE integration_attribute_mappings
      ADD CONSTRAINT fk_company 
        FOREIGN KEY (company_id) 
        REFERENCES companies(id) 
        ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
    ALTER TABLE integration_attribute_mappings
      ADD CONSTRAINT fk_store 
        FOREIGN KEY (store_id) 
        REFERENCES stores(id) 
        ON DELETE CASCADE;
  END IF;
END $$;

-- Add parent mapping constraint
ALTER TABLE integration_attribute_mappings
  ADD CONSTRAINT fk_parent_mapping 
    FOREIGN KEY (parent_mapping_id) 
    REFERENCES integration_attribute_mappings(id) 
    ON DELETE SET NULL;

-- Add index for efficient querying by context
CREATE INDEX IF NOT EXISTS idx_integration_mappings_context 
  ON integration_attribute_mappings(wand_integration_source_id, integration_type, is_template, concept_id, company_id, store_id);

-- Add check constraint for application level
ALTER TABLE integration_attribute_mappings
  ADD CONSTRAINT chk_application_level 
    CHECK (application_level IN ('concept', 'company', 'store') OR application_level IS NULL);