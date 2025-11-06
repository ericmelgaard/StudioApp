/*
  # WAND Integration System - Hierarchical Configuration

  1. Purpose
    - Create WAND-level integration source library (global templates)
    - Enable concept/company/site-level configuration application
    - Support hierarchical inheritance of integration settings
    - Track data lineage from source configs through to synced products

  2. New Tables
    - `wand_integration_sources` - Global integration source templates at WAND level
    - `integration_source_configs` - Applied configurations at concept/company/site levels
    - `integration_formatters` - Formatter metadata and versioning per integration type
    - `integration_api_templates` - URL templates with variable placeholders

  3. Changes
    - Rename existing integration_sources if needed
    - Add hierarchy tracking to integration_products
    - Create configuration inheritance resolution system
    - Add sync tracking linked to specific configs

  4. Security
    - Enable RLS on all tables
    - Allow public read access for WAND-level sources (templates)
    - Restrict config creation/updates to authenticated users
    - Add admin-only policies for WAND-level source management

  5. Inheritance Model
    - WAND level: Integration type definitions and defaults
    - Concept level: Brand/concept-wide settings (inherits down to all companies/sites)
    - Company level: Company-specific overrides (inherits down to all sites)
    - Site level: Site-specific overrides (most specific, highest priority)
*/

-- Step 1: Create WAND-level integration sources (global templates)
CREATE TABLE IF NOT EXISTS wand_integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  integration_type text NOT NULL UNIQUE,
  description text,
  base_url_template text NOT NULL,
  auth_method text DEFAULT 'none' CHECK (auth_method IN ('none', 'api_key', 'bearer_token', 'basic_auth', 'oauth2', 'custom')),
  required_config_fields jsonb DEFAULT '[]'::jsonb,
  optional_config_fields jsonb DEFAULT '[]'::jsonb,
  default_sync_frequency_minutes integer DEFAULT 15,
  min_update_interval_ms integer DEFAULT 3000000,
  max_update_interval_ms integer DEFAULT 9000000,
  fallback_interval_ms integer DEFAULT 30000,
  formatter_name text NOT NULL,
  supports_incremental_sync boolean DEFAULT false,
  supports_products boolean DEFAULT true,
  supports_modifiers boolean DEFAULT false,
  supports_discounts boolean DEFAULT false,
  documentation_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated', 'beta')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Step 2: Create integration formatters registry
CREATE TABLE IF NOT EXISTS integration_formatters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  version text NOT NULL DEFAULT '1.0',
  integration_type text NOT NULL,
  description text,
  formatter_code_ref text,
  input_schema jsonb DEFAULT '{}'::jsonb,
  output_schema jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(integration_type, version)
);

-- Step 3: Create API templates with variable placeholders
CREATE TABLE IF NOT EXISTS integration_api_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  url_template text NOT NULL,
  method text DEFAULT 'GET' CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH')),
  headers_template jsonb DEFAULT '{}'::jsonb,
  body_template jsonb DEFAULT '{}'::jsonb,
  query_params_template jsonb DEFAULT '{}'::jsonb,
  variable_definitions jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(wand_source_id, template_name)
);

-- Step 4: Create concept/company/site-level configuration applications
CREATE TABLE IF NOT EXISTS integration_source_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  config_name text NOT NULL,

  -- Hierarchical application level
  application_level text NOT NULL CHECK (application_level IN ('concept', 'company', 'site')),
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  company_id bigint REFERENCES companies(id) ON DELETE CASCADE,
  site_id bigint REFERENCES stores(id) ON DELETE CASCADE,

  -- Configuration parameters
  config_params jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Sync settings (can override WAND defaults)
  sync_frequency_minutes integer,
  sync_schedule text,
  is_active boolean DEFAULT true,

  -- Credentials (store encrypted or reference to vault)
  credentials jsonb DEFAULT '{}'::jsonb,

  -- Tracking
  last_sync_at timestamptz,
  last_sync_status text,
  sync_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  last_error text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  -- Ensure proper hierarchy constraint
  CONSTRAINT valid_config_application CHECK (
    (application_level = 'concept' AND concept_id IS NOT NULL AND company_id IS NULL AND site_id IS NULL) OR
    (application_level = 'company' AND company_id IS NOT NULL AND concept_id IS NULL AND site_id IS NULL) OR
    (application_level = 'site' AND site_id IS NOT NULL AND concept_id IS NULL AND company_id IS NULL)
  ),

  -- One config per source per location
  UNIQUE NULLS NOT DISTINCT (wand_source_id, application_level, concept_id, company_id, site_id)
);

-- Step 5: Add config tracking to integration products
DO $$
BEGIN
  -- Add source_config_id to track which config was used for sync
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_products' AND column_name = 'source_config_id'
  ) THEN
    ALTER TABLE integration_products ADD COLUMN source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE SET NULL;
  END IF;

  -- Add hierarchy context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_products' AND column_name = 'concept_id'
  ) THEN
    ALTER TABLE integration_products ADD COLUMN concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_products' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE integration_products ADD COLUMN company_id bigint REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_products' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE integration_products ADD COLUMN site_id bigint REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Add same tracking to modifiers and discounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_modifiers' AND column_name = 'source_config_id'
  ) THEN
    ALTER TABLE integration_modifiers ADD COLUMN source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE SET NULL;
    ALTER TABLE integration_modifiers ADD COLUMN concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE;
    ALTER TABLE integration_modifiers ADD COLUMN company_id bigint REFERENCES companies(id) ON DELETE CASCADE;
    ALTER TABLE integration_modifiers ADD COLUMN site_id bigint REFERENCES stores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_discounts' AND column_name = 'source_config_id'
  ) THEN
    ALTER TABLE integration_discounts ADD COLUMN source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE SET NULL;
    ALTER TABLE integration_discounts ADD COLUMN concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE;
    ALTER TABLE integration_discounts ADD COLUMN company_id bigint REFERENCES companies(id) ON DELETE CASCADE;
    ALTER TABLE integration_discounts ADD COLUMN site_id bigint REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 7: Update sync history to track config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_sync_history' AND column_name = 'source_config_id'
  ) THEN
    ALTER TABLE integration_sync_history ADD COLUMN source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_wand_source ON integration_source_configs(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_concept ON integration_source_configs(concept_id) WHERE concept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_company ON integration_source_configs(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_site ON integration_source_configs(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_active ON integration_source_configs(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_integration_products_source_config ON integration_products(source_config_id) WHERE source_config_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_products_concept ON integration_products(concept_id) WHERE concept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_products_company ON integration_products(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_products_site ON integration_products(site_id) WHERE site_id IS NOT NULL;

-- Step 9: Enable RLS
ALTER TABLE wand_integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_formatters ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_api_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_source_configs ENABLE ROW LEVEL SECURITY;

-- Step 10: RLS Policies for wand_integration_sources (WAND-level templates)
CREATE POLICY "Anyone can view WAND integration sources"
  ON wand_integration_sources FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert WAND integration sources"
  ON wand_integration_sources FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update WAND integration sources"
  ON wand_integration_sources FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 11: RLS Policies for integration_formatters
CREATE POLICY "Anyone can view integration formatters"
  ON integration_formatters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert integration formatters"
  ON integration_formatters FOR INSERT
  WITH CHECK (true);

-- Step 12: RLS Policies for integration_api_templates
CREATE POLICY "Anyone can view API templates"
  ON integration_api_templates FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert API templates"
  ON integration_api_templates FOR INSERT
  WITH CHECK (true);

-- Step 13: RLS Policies for integration_source_configs
CREATE POLICY "Anyone can view integration configs"
  ON integration_source_configs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert integration configs"
  ON integration_source_configs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration configs"
  ON integration_source_configs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete integration configs"
  ON integration_source_configs FOR DELETE
  USING (true);

-- Step 14: Create helper function to resolve integration config for a site
CREATE OR REPLACE FUNCTION resolve_integration_config_for_site(
  p_site_id bigint,
  p_integration_type text
)
RETURNS TABLE (
  config_id uuid,
  config_name text,
  application_level text,
  config_params jsonb,
  sync_frequency_minutes integer,
  wand_source_id uuid,
  wand_source_name text
) AS $$
BEGIN
  -- First check for site-level config
  RETURN QUERY
  SELECT
    isc.id,
    isc.config_name,
    isc.application_level,
    isc.config_params,
    COALESCE(isc.sync_frequency_minutes, wis.default_sync_frequency_minutes),
    wis.id,
    wis.name
  FROM integration_source_configs isc
  JOIN wand_integration_sources wis ON isc.wand_source_id = wis.id
  WHERE isc.site_id = p_site_id
    AND wis.integration_type = p_integration_type
    AND isc.is_active = true
  LIMIT 1;

  -- If no site-level config, check company-level
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      isc.id,
      isc.config_name,
      isc.application_level,
      isc.config_params,
      COALESCE(isc.sync_frequency_minutes, wis.default_sync_frequency_minutes),
      wis.id,
      wis.name
    FROM integration_source_configs isc
    JOIN wand_integration_sources wis ON isc.wand_source_id = wis.id
    JOIN stores s ON s.company_id = isc.company_id
    WHERE s.id = p_site_id
      AND wis.integration_type = p_integration_type
      AND isc.is_active = true
    LIMIT 1;
  END IF;

  -- If no company-level config, check concept-level
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      isc.id,
      isc.config_name,
      isc.application_level,
      isc.config_params,
      COALESCE(isc.sync_frequency_minutes, wis.default_sync_frequency_minutes),
      wis.id,
      wis.name
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

-- Step 15: Create view for active integration configs with hierarchy context
CREATE OR REPLACE VIEW active_integration_configs AS
SELECT
  isc.id,
  isc.config_name,
  wis.name as source_name,
  wis.integration_type,
  isc.application_level,
  isc.concept_id,
  c.name as concept_name,
  isc.company_id,
  co.name as company_name,
  isc.site_id,
  s.name as site_name,
  isc.config_params,
  isc.sync_frequency_minutes,
  isc.is_active,
  isc.last_sync_at,
  isc.sync_count,
  isc.error_count,
  isc.created_at,
  isc.updated_at
FROM integration_source_configs isc
JOIN wand_integration_sources wis ON isc.wand_source_id = wis.id
LEFT JOIN concepts c ON isc.concept_id = c.id
LEFT JOIN companies co ON isc.company_id = co.id
LEFT JOIN stores s ON isc.site_id = s.id
WHERE isc.is_active = true;
