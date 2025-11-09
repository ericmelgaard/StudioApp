/*
  # Fix Integration Attribute Mappings Schema and Add Hierarchy Support

  1. Purpose
    - Align column naming to use wand_integration_source_id consistently
    - Add hierarchy tracking for concept/company/site level mappings
    - Enable inheritance from WAND Development to child concepts
    - Fix visibility issue where mappings don't appear after save

  2. Schema Changes
    - Migrate source_id to wand_integration_source_id (ensure consistency)
    - Add application_level (concept/company/site)
    - Add concept_id, company_id, site_id for hierarchy tracking
    - Add is_inherited flag to track if mapping is inherited from parent
    - Add parent_mapping_id to track inheritance chain
    - Update unique constraints to prevent duplicates per source/type/level

  3. Data Migration
    - Migrate existing source_id references to wand_integration_source_id
    - Find WAND Development concept and associate existing mappings
    - Set default application_level to 'concept' for existing templates

  4. Indexes
    - Add indexes on hierarchy columns for query performance
    - Add composite index on (wand_integration_source_id, integration_type, application_level)

  5. Security
    - Maintain existing RLS policies
    - Ensure proper access control for hierarchy levels
*/

-- Step 1: Check current schema and add missing columns
DO $$
BEGIN
  -- Ensure wand_integration_source_id exists (it should from earlier migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'wand_integration_source_id'
  ) THEN
    -- If wand_integration_source_id doesn't exist, migrate from source_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'integration_attribute_mappings' AND column_name = 'source_id'
    ) THEN
      -- Rename source_id to wand_integration_source_id
      ALTER TABLE integration_attribute_mappings 
        RENAME COLUMN source_id TO wand_integration_source_id;
    ELSE
      -- Add new column with FK constraint
      ALTER TABLE integration_attribute_mappings
        ADD COLUMN wand_integration_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add hierarchy tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'application_level'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN application_level text DEFAULT 'concept' CHECK (application_level IN ('concept', 'company', 'site'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'concept_id'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN company_id bigint REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN site_id bigint REFERENCES stores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'is_inherited'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN is_inherited boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'parent_mapping_id'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN parent_mapping_id uuid REFERENCES integration_attribute_mappings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Drop old source_id column if it still exists separately
DO $$
BEGIN
  -- Check if both source_id and wand_integration_source_id exist (shouldn't happen after rename)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'source_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'wand_integration_source_id'
  ) THEN
    -- Drop the old source_id column
    ALTER TABLE integration_attribute_mappings DROP COLUMN IF EXISTS source_id;
  END IF;
END $$;

-- Step 3: Add attribute_mappings column if using old schema (field_mappings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'attribute_mappings'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'field_mappings'
  ) THEN
    -- Rename field_mappings to attribute_mappings for consistency
    ALTER TABLE integration_attribute_mappings 
      RENAME COLUMN field_mappings TO attribute_mappings;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'attribute_mappings'
  ) THEN
    -- Add attribute_mappings if neither exists
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN attribute_mappings jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Step 4: Ensure is_template column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'is_template'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN is_template boolean DEFAULT true;
  END IF;
END $$;

-- Step 5: Ensure template_name column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE integration_attribute_mappings
      ADD COLUMN template_name text;
  END IF;
END $$;

-- Step 6: Add hierarchy constraint
ALTER TABLE integration_attribute_mappings
  DROP CONSTRAINT IF EXISTS valid_mapping_application;

ALTER TABLE integration_attribute_mappings
  ADD CONSTRAINT valid_mapping_application CHECK (
    (application_level = 'concept' AND concept_id IS NOT NULL AND company_id IS NULL AND site_id IS NULL) OR
    (application_level = 'company' AND company_id IS NOT NULL AND concept_id IS NULL AND site_id IS NULL) OR
    (application_level = 'site' AND site_id IS NOT NULL AND concept_id IS NULL AND company_id IS NULL)
  );

-- Step 7: Add unique constraint to prevent duplicate mappings
DROP INDEX IF EXISTS idx_unique_mapping_per_source_type_level;

CREATE UNIQUE INDEX idx_unique_mapping_per_source_type_level
  ON integration_attribute_mappings(wand_integration_source_id, integration_type, application_level, COALESCE(concept_id, 0), COALESCE(company_id, 0), COALESCE(site_id, 0))
  WHERE is_template = true;

-- Step 8: Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_wand_source 
  ON integration_attribute_mappings(wand_integration_source_id);

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_concept 
  ON integration_attribute_mappings(concept_id) WHERE concept_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_company 
  ON integration_attribute_mappings(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_site 
  ON integration_attribute_mappings(site_id) WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_type 
  ON integration_attribute_mappings(integration_type);

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_template 
  ON integration_attribute_mappings(is_template) WHERE is_template = true;

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_parent 
  ON integration_attribute_mappings(parent_mapping_id) WHERE parent_mapping_id IS NOT NULL;

-- Step 9: Data migration - Find WAND Development concept and update existing mappings
DO $$
DECLARE
  v_wand_concept_id bigint;
BEGIN
  -- Find WAND Development concept (case insensitive)
  SELECT id INTO v_wand_concept_id
  FROM concepts
  WHERE LOWER(name) LIKE '%wand%development%'
  LIMIT 1;

  -- If WAND Development concept exists, associate existing template mappings with it
  IF v_wand_concept_id IS NOT NULL THEN
    UPDATE integration_attribute_mappings
    SET 
      concept_id = v_wand_concept_id,
      application_level = 'concept',
      is_inherited = false
    WHERE is_template = true
      AND concept_id IS NULL
      AND application_level = 'concept';
  END IF;
END $$;

-- Step 10: Create function to resolve mapping inheritance
CREATE OR REPLACE FUNCTION get_integration_mapping_for_context(
  p_wand_source_id uuid,
  p_integration_type text,
  p_concept_id bigint DEFAULT NULL,
  p_company_id bigint DEFAULT NULL,
  p_site_id bigint DEFAULT NULL
)
RETURNS TABLE (
  mapping_id uuid,
  mapping_data jsonb,
  template_name text,
  application_level text,
  is_inherited boolean,
  source_concept_id bigint,
  source_company_id bigint,
  source_site_id bigint
) AS $$
DECLARE
  v_concept_id bigint;
BEGIN
  -- If site_id provided, get its concept
  IF p_site_id IS NOT NULL THEN
    SELECT c.concept_id INTO v_concept_id
    FROM stores s
    JOIN companies c ON s.company_id = c.id
    WHERE s.id = p_site_id;
  ELSIF p_company_id IS NOT NULL THEN
    SELECT concept_id INTO v_concept_id
    FROM companies
    WHERE id = p_company_id;
  ELSE
    v_concept_id := p_concept_id;
  END IF;

  -- First check for site-level mapping
  IF p_site_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      iam.id,
      iam.attribute_mappings,
      iam.template_name,
      iam.application_level,
      iam.is_inherited,
      iam.concept_id,
      iam.company_id,
      iam.site_id
    FROM integration_attribute_mappings iam
    WHERE iam.wand_integration_source_id = p_wand_source_id
      AND iam.integration_type = p_integration_type
      AND iam.site_id = p_site_id
      AND iam.is_template = true
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Then check for company-level mapping
  IF p_company_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      iam.id,
      iam.attribute_mappings,
      iam.template_name,
      iam.application_level,
      iam.is_inherited,
      iam.concept_id,
      iam.company_id,
      iam.site_id
    FROM integration_attribute_mappings iam
    WHERE iam.wand_integration_source_id = p_wand_source_id
      AND iam.integration_type = p_integration_type
      AND iam.company_id = p_company_id
      AND iam.is_template = true
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Finally check for concept-level mapping (includes inherited from WAND Development)
  IF v_concept_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      iam.id,
      iam.attribute_mappings,
      iam.template_name,
      iam.application_level,
      iam.is_inherited,
      iam.concept_id,
      iam.company_id,
      iam.site_id
    FROM integration_attribute_mappings iam
    WHERE iam.wand_integration_source_id = p_wand_source_id
      AND iam.integration_type = p_integration_type
      AND iam.concept_id = v_concept_id
      AND iam.is_template = true
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- No mapping found
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 11: Add helpful comments
COMMENT ON COLUMN integration_attribute_mappings.application_level IS 'Hierarchy level where this mapping is defined: concept, company, or site';
COMMENT ON COLUMN integration_attribute_mappings.concept_id IS 'Concept ID if application_level is concept';
COMMENT ON COLUMN integration_attribute_mappings.company_id IS 'Company ID if application_level is company';
COMMENT ON COLUMN integration_attribute_mappings.site_id IS 'Site ID if application_level is site';
COMMENT ON COLUMN integration_attribute_mappings.is_inherited IS 'True if this mapping is inherited from a parent level';
COMMENT ON COLUMN integration_attribute_mappings.parent_mapping_id IS 'Reference to parent mapping if inherited';
COMMENT ON FUNCTION get_integration_mapping_for_context IS 'Resolves the appropriate integration mapping based on hierarchy: site > company > concept';
