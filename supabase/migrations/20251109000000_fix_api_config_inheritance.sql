/*
  # Fix API Configuration Inheritance Model

  1. Purpose
    - Separate integration source AVAILABILITY from API configuration VALUES
    - Source availability (which integrations are enabled) CAN inherit from concept level
    - API configuration values (credentials, establishment IDs) CANNOT inherit and must be set at each location
    - Clean up existing concept-level configs that have location-specific API values

  2. Changes
    - Update resolve_integration_config_for_site function to separate availability from values
    - Clear API-specific values from concept-level configs (they should only indicate availability)
    - Add helper function to check if source is available vs fully configured
    - Update function comments to document the two-tier inheritance model

  3. Data Cleanup
    - Remove establishment IDs and brand names from concept-level configs
    - Remove credentials from concept-level configs
    - Preserve the source availability relationship (wand_source_id stays at concept level)

  4. Security & Data Isolation
    - Ensure API credentials never leak across locations via inheritance
    - Each site must have its own explicit API configuration
    - Prevent accidental data access by using wrong establishment IDs
*/

-- Step 1: Clean up existing concept-level configs with API values
-- These should only indicate source availability, not have actual API config
DO $$
DECLARE
  config_record RECORD;
BEGIN
  -- Find all concept-level configs with API values
  FOR config_record IN
    SELECT id, config_name, config_params, credentials
    FROM integration_source_configs
    WHERE application_level = 'concept'
      AND (
        config_params IS NOT NULL
        OR (credentials IS NOT NULL AND credentials::text != '{}'::text)
      )
  LOOP
    RAISE NOTICE 'Cleaning API values from concept-level config: % (ID: %)', config_record.config_name, config_record.id;

    -- Log what we're removing for audit trail
    IF config_record.config_params IS NOT NULL AND config_record.config_params::text != '{}'::text THEN
      RAISE NOTICE '  Removing config_params: %', config_record.config_params::text;
    END IF;

    IF config_record.credentials IS NOT NULL AND config_record.credentials::text != '{}'::text THEN
      RAISE NOTICE '  Removing credentials (present)';
    END IF;

    -- Clear the API-specific values but keep the source availability
    UPDATE integration_source_configs
    SET
      config_params = '{}'::jsonb,
      credentials = '{}'::jsonb,
      updated_at = now()
    WHERE id = config_record.id;
  END LOOP;
END $$;

-- Step 2: Drop and recreate resolve_integration_config_for_site function with new logic
DROP FUNCTION IF EXISTS resolve_integration_config_for_site(bigint, text);

-- Step 3: Create new function that separates availability from configuration
CREATE OR REPLACE FUNCTION resolve_integration_config_for_site(
  p_site_id bigint,
  p_integration_type text
)
RETURNS TABLE (
  config_id uuid,
  config_name text,
  application_level text,
  config_params jsonb,
  credentials jsonb,
  sync_frequency_minutes integer,
  wand_source_id uuid,
  wand_source_name text,
  is_fully_configured boolean
) AS $$
BEGIN
  /*
    Two-Tier Inheritance Model:

    1. SOURCE AVAILABILITY (inherited):
       - Concept-level configs indicate which integration sources are available
       - These cascade down to all companies and sites under that concept
       - config_params and credentials should be empty at concept level

    2. API CONFIGURATION (NOT inherited):
       - Each site must have its own config with actual API values
       - establishment IDs, credentials, brand names must be set at site level
       - These values NEVER inherit from parent levels

    Resolution Logic:
    - First, check for site-level config with actual API values (fully configured)
    - If none, check for company-level config with API values (fully configured)
    - If none, check if source is available at concept level (available but not configured)
    - Return is_fully_configured flag to indicate whether API values are present
  */

  -- Priority 1: Check for site-level config with API configuration
  RETURN QUERY
  SELECT
    isc.id,
    isc.config_name,
    isc.application_level,
    isc.config_params,
    isc.credentials,
    COALESCE(isc.sync_frequency_minutes, wis.default_sync_frequency_minutes),
    wis.id,
    wis.name,
    (isc.config_params IS NOT NULL
     AND isc.config_params::text != '{}'::text) as is_fully_configured
  FROM integration_source_configs isc
  JOIN wand_integration_sources wis ON isc.wand_source_id = wis.id
  WHERE isc.site_id = p_site_id
    AND wis.integration_type = p_integration_type
    AND isc.is_active = true
  LIMIT 1;

  -- Priority 2: If no site-level config, check company-level
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      isc.id,
      isc.config_name,
      isc.application_level,
      isc.config_params,
      isc.credentials,
      COALESCE(isc.sync_frequency_minutes, wis.default_sync_frequency_minutes),
      wis.id,
      wis.name,
      (isc.config_params IS NOT NULL
       AND isc.config_params::text != '{}'::text) as is_fully_configured
    FROM integration_source_configs isc
    JOIN wand_integration_sources wis ON isc.wand_source_id = wis.id
    JOIN stores s ON s.company_id = isc.company_id
    WHERE s.id = p_site_id
      AND wis.integration_type = p_integration_type
      AND isc.is_active = true
    LIMIT 1;
  END IF;

  -- Priority 3: If no company-level config, check concept-level for availability only
  -- Note: Concept-level configs indicate source is available but not configured
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      isc.id,
      isc.config_name || ' (Available - Configure for this location)',
      isc.application_level,
      '{}'::jsonb as config_params,  -- Always return empty - don't inherit
      '{}'::jsonb as credentials,     -- Always return empty - don't inherit
      COALESCE(isc.sync_frequency_minutes, wis.default_sync_frequency_minutes),
      wis.id,
      wis.name,
      false as is_fully_configured    -- Concept level = available but not configured
    FROM integration_source_configs isc
    JOIN wand_integration_sources wis ON isc.wand_source_id = wis.id
    JOIN stores s ON s.id = p_site_id
    JOIN companies c ON s.company_id = c.id
    WHERE c.concept_id = isc.concept_id
      AND wis.integration_type = p_integration_type
      AND isc.is_active = true
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create helper function to check if integration source is available for a site
CREATE OR REPLACE FUNCTION is_integration_source_available(
  p_site_id bigint,
  p_integration_type text
)
RETURNS boolean AS $$
DECLARE
  v_available boolean;
BEGIN
  -- Check if source is configured at any level (site, company, or concept)
  SELECT EXISTS (
    SELECT 1 FROM resolve_integration_config_for_site(p_site_id, p_integration_type)
  ) INTO v_available;

  RETURN v_available;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create helper function to get available but unconfigured sources
CREATE OR REPLACE FUNCTION get_available_integration_sources(
  p_site_id bigint
)
RETURNS TABLE (
  wand_source_id uuid,
  wand_source_name text,
  integration_type text,
  available_from_level text,
  is_configured boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH site_info AS (
    SELECT s.id as site_id, s.company_id, c.concept_id
    FROM stores s
    JOIN companies c ON s.company_id = c.id
    WHERE s.id = p_site_id
  )
  SELECT DISTINCT
    wis.id,
    wis.name,
    wis.integration_type,
    CASE
      WHEN isc_site.id IS NOT NULL THEN 'site'
      WHEN isc_company.id IS NOT NULL THEN 'company'
      WHEN isc_concept.id IS NOT NULL THEN 'concept'
      ELSE NULL
    END as available_from_level,
    COALESCE(
      (isc_site.config_params IS NOT NULL AND isc_site.config_params::text != '{}'::text),
      (isc_company.config_params IS NOT NULL AND isc_company.config_params::text != '{}'::text),
      false
    ) as is_configured
  FROM wand_integration_sources wis
  CROSS JOIN site_info si
  LEFT JOIN integration_source_configs isc_site
    ON isc_site.wand_source_id = wis.id
    AND isc_site.site_id = si.site_id
    AND isc_site.is_active = true
  LEFT JOIN integration_source_configs isc_company
    ON isc_company.wand_source_id = wis.id
    AND isc_company.company_id = si.company_id
    AND isc_company.is_active = true
  LEFT JOIN integration_source_configs isc_concept
    ON isc_concept.wand_source_id = wis.id
    AND isc_concept.concept_id = si.concept_id
    AND isc_concept.is_active = true
  WHERE (isc_site.id IS NOT NULL
    OR isc_company.id IS NOT NULL
    OR isc_concept.id IS NOT NULL)
  ORDER BY wis.name;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add comment to integration_source_configs table documenting the model
COMMENT ON TABLE integration_source_configs IS
'Integration source configurations with two-tier inheritance:
1. SOURCE AVAILABILITY: Concept-level configs indicate which sources are available to all child locations
2. API CONFIGURATION: Site/company-level configs contain actual API values (credentials, establishment IDs)
Concept-level configs should have empty config_params and credentials - they only indicate availability.';

COMMENT ON COLUMN integration_source_configs.config_params IS
'API configuration parameters. Should be empty at concept level (availability only).
Must be populated at site/company level for actual API access.';

COMMENT ON COLUMN integration_source_configs.credentials IS
'API credentials (keys, tokens). Should be empty at concept level (availability only).
Must be populated at site/company level for actual API access.';
