/*
  # Fix WAND Integration Sources Schema

  1. Purpose
    - Drop the simplified wand_integration_sources table
    - Recreate with comprehensive schema from yesterday's work
    - Restore all integration formatter and config tracking tables

  2. Changes
    - Drop and recreate wand_integration_sources with full schema
    - Recreate integration_formatters table
    - Recreate integration_api_templates table
    - Recreate integration_source_configs table
*/

-- Drop existing simplified table
DROP TABLE IF EXISTS wand_integration_sources CASCADE;

-- Recreate with comprehensive schema
CREATE TABLE wand_integration_sources (
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

-- Create integration formatters registry
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

-- Create API templates with variable placeholders
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

-- Create concept/company/site-level configuration applications
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

-- Enable RLS
ALTER TABLE wand_integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_formatters ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_api_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_source_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

CREATE POLICY "Anyone can view integration formatters"
  ON integration_formatters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert integration formatters"
  ON integration_formatters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view API templates"
  ON integration_api_templates FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert API templates"
  ON integration_api_templates FOR INSERT
  WITH CHECK (true);

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_wand_source ON integration_source_configs(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_concept ON integration_source_configs(concept_id) WHERE concept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_company ON integration_source_configs(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_site ON integration_source_configs(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_active ON integration_source_configs(is_active) WHERE is_active = true;
