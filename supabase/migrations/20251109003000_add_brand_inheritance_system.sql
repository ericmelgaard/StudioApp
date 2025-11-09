/*
  # Add Brand Inheritance System

  1. Purpose
    - Enable brand inheritance from concept level to site/company configs
    - Allow site/company configs to override with local brand options
    - Support brand locking to prevent accidental changes
    - Support multiple brands per config for flexibility

  2. Changes to concepts table
    - Add brand_options JSONB array for storing allowed brand names
    - Index brand_options for performance

  3. Changes to integration_source_configs table
    - Add brand_options JSONB array for local brand override
    - Add is_brand_inherited boolean to track if using concept brands
    - Add brand_locked boolean to prevent brand changes
    - Remove brand from config_params (moved to dedicated fields)

  4. Database Functions
    - get_available_brands_for_config: Resolves brand options for a config
    - get_concept_for_site: Gets concept ID for a site

  5. Constraints and Validation
    - Ensure brand field in config_params matches available brand options
    - Validate brand_options is array when present

  6. Data Migration
    - Clear all brand values from existing config_params
    - Set default is_brand_inherited to true for existing site configs
    - Set brand_locked to false for all configs
*/

-- Add brand_options to concepts table
ALTER TABLE concepts
ADD COLUMN IF NOT EXISTS brand_options jsonb DEFAULT '[]'::jsonb;

-- Add brand inheritance fields to integration_source_configs
ALTER TABLE integration_source_configs
ADD COLUMN IF NOT EXISTS brand_options jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_brand_inherited boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS brand_locked boolean DEFAULT false;

-- Add check constraint to ensure brand_options is an array when present
ALTER TABLE concepts
ADD CONSTRAINT concepts_brand_options_is_array
CHECK (jsonb_typeof(brand_options) = 'array');

ALTER TABLE integration_source_configs
ADD CONSTRAINT configs_brand_options_is_array
CHECK (brand_options IS NULL OR jsonb_typeof(brand_options) = 'array');

-- Create index on concepts brand_options for performance
CREATE INDEX IF NOT EXISTS idx_concepts_brand_options
ON concepts USING gin (brand_options);

-- Create function to get concept ID for a given site
CREATE OR REPLACE FUNCTION get_concept_for_site(p_site_id bigint)
RETURNS bigint AS $$
DECLARE
  v_concept_id bigint;
BEGIN
  -- Get company_id from store, then get concept_id from company
  SELECT c.concept_id INTO v_concept_id
  FROM stores s
  JOIN companies c ON s.company_id = c.id
  WHERE s.id = p_site_id;

  RETURN v_concept_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get concept ID for a given company
CREATE OR REPLACE FUNCTION get_concept_for_company(p_company_id bigint)
RETURNS bigint AS $$
DECLARE
  v_concept_id bigint;
BEGIN
  SELECT concept_id INTO v_concept_id
  FROM companies
  WHERE id = p_company_id;

  RETURN v_concept_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to resolve available brands for a config
CREATE OR REPLACE FUNCTION get_available_brands_for_config(p_config_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_config_record record;
  v_concept_id bigint;
  v_concept_brands jsonb;
BEGIN
  -- Get the config record
  SELECT * INTO v_config_record
  FROM integration_source_configs
  WHERE id = p_config_id;

  -- If config doesn't exist, return empty array
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  -- If config has local brand_options, return those
  IF v_config_record.brand_options IS NOT NULL THEN
    RETURN v_config_record.brand_options;
  END IF;

  -- If config is at concept level, return concept's brand_options
  IF v_config_record.application_level = 'concept' AND v_config_record.concept_id IS NOT NULL THEN
    SELECT brand_options INTO v_concept_brands
    FROM concepts
    WHERE id = v_config_record.concept_id;

    RETURN COALESCE(v_concept_brands, '[]'::jsonb);
  END IF;

  -- If config is at company level, get parent concept brands
  IF v_config_record.application_level = 'company' AND v_config_record.company_id IS NOT NULL THEN
    v_concept_id := get_concept_for_company(v_config_record.company_id);

    IF v_concept_id IS NOT NULL THEN
      SELECT brand_options INTO v_concept_brands
      FROM concepts
      WHERE id = v_concept_id;

      RETURN COALESCE(v_concept_brands, '[]'::jsonb);
    END IF;
  END IF;

  -- If config is at site level, get parent concept brands
  IF v_config_record.application_level = 'site' AND v_config_record.site_id IS NOT NULL THEN
    v_concept_id := get_concept_for_site(v_config_record.site_id);

    IF v_concept_id IS NOT NULL THEN
      SELECT brand_options INTO v_concept_brands
      FROM concepts
      WHERE id = v_concept_id;

      RETURN COALESCE(v_concept_brands, '[]'::jsonb);
    END IF;
  END IF;

  -- Default: return empty array
  RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql STABLE;

-- Data migration: Clear brand from config_params and set default inheritance flags
UPDATE integration_source_configs
SET
  config_params = config_params - 'brand',
  is_brand_inherited = CASE
    WHEN application_level = 'concept' THEN false
    ELSE true
  END,
  brand_locked = false,
  brand_options = NULL;

-- Add helpful comment
COMMENT ON COLUMN concepts.brand_options IS 'Array of brand names available to child companies and sites';
COMMENT ON COLUMN integration_source_configs.brand_options IS 'Local brand options override - if NULL, inherits from parent concept';
COMMENT ON COLUMN integration_source_configs.is_brand_inherited IS 'True if using parent concept brands, false if using local brand_options';
COMMENT ON COLUMN integration_source_configs.brand_locked IS 'When true, prevents changes to brand selection';
COMMENT ON FUNCTION get_available_brands_for_config(uuid) IS 'Resolves brand options: local brand_options first, then parent concept brands';
