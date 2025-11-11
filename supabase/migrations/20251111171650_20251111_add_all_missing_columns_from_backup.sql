-- Add all missing columns from backup data to match old database schema

-- Concepts table - add missing columns
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS brand_primary_color text;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS brand_secondary_color text;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS brand_options jsonb DEFAULT '[]'::jsonb;

-- Companies table - add missing columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;

-- Stores table - add missing columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS phone text;

-- User profiles table - add missing columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_by uuid;

-- Placement groups table - add missing columns
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS daypart_hours jsonb;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS meal_stations jsonb;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS templates jsonb;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS nfc_url text;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS is_store_root boolean DEFAULT false;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE placement_groups ADD COLUMN IF NOT EXISTS operating_hours jsonb;

-- Product templates table - add missing columns
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS template_type text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS dimensions jsonb;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS design_data jsonb;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS preview_url text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS created_by uuid;

-- WAND integration sources table - add missing columns
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS base_url_template text;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS auth_method text;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS required_config_fields jsonb;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS optional_config_fields jsonb;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS default_sync_frequency_minutes integer;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS min_update_interval_ms integer;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS max_update_interval_ms integer;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS fallback_interval_ms integer;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS formatter_name text;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS supports_incremental_sync boolean DEFAULT false;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS supports_products boolean DEFAULT true;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS supports_modifiers boolean DEFAULT false;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS supports_discounts boolean DEFAULT false;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS documentation_url text;
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE wand_integration_sources ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Integration source configs table - add missing columns
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS config_name text;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS application_level text;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS site_id bigint;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS config_params jsonb;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS sync_frequency_minutes integer;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS sync_schedule jsonb;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS credentials jsonb;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS last_sync_status text;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS sync_count integer DEFAULT 0;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS brand_options jsonb;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS is_brand_inherited boolean DEFAULT false;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS brand_locked boolean DEFAULT false;
ALTER TABLE integration_source_configs ADD COLUMN IF NOT EXISTS wand_source_id uuid;

-- Integration products table - add missing columns
ALTER TABLE integration_products ADD COLUMN IF NOT EXISTS source_id uuid;
ALTER TABLE integration_products ADD COLUMN IF NOT EXISTS path_id text;
ALTER TABLE integration_products ADD COLUMN IF NOT EXISTS item_type text;
ALTER TABLE integration_products ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE integration_products ADD COLUMN IF NOT EXISTS source_config_id uuid;
ALTER TABLE integration_products ADD COLUMN IF NOT EXISTS site_id bigint;

-- Integration modifiers table - add missing columns
ALTER TABLE integration_modifiers ADD COLUMN IF NOT EXISTS source_id uuid;
ALTER TABLE integration_modifiers ADD COLUMN IF NOT EXISTS path_id text;
ALTER TABLE integration_modifiers ADD COLUMN IF NOT EXISTS modifier_group_id text;
ALTER TABLE integration_modifiers ADD COLUMN IF NOT EXISTS modifier_group_name text;
ALTER TABLE integration_modifiers ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE integration_modifiers ADD COLUMN IF NOT EXISTS source_config_id uuid;
ALTER TABLE integration_modifiers ADD COLUMN IF NOT EXISTS site_id bigint;

-- Integration discounts table - add missing columns
ALTER TABLE integration_discounts ADD COLUMN IF NOT EXISTS source_id uuid;
ALTER TABLE integration_discounts ADD COLUMN IF NOT EXISTS discount_amount numeric;
ALTER TABLE integration_discounts ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE integration_discounts ADD COLUMN IF NOT EXISTS source_config_id uuid;
ALTER TABLE integration_discounts ADD COLUMN IF NOT EXISTS site_id bigint;

-- Integration formatters table - add missing columns
ALTER TABLE integration_formatters ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE integration_formatters ADD COLUMN IF NOT EXISTS integration_type text;
ALTER TABLE integration_formatters ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE integration_formatters ADD COLUMN IF NOT EXISTS formatter_code_ref text;
ALTER TABLE integration_formatters ADD COLUMN IF NOT EXISTS input_schema jsonb;
ALTER TABLE integration_formatters ADD COLUMN IF NOT EXISTS output_schema jsonb;
ALTER TABLE integration_formatters ADD COLUMN IF NOT EXISTS name text;

-- Drop the old formatter_code column if it conflicts
ALTER TABLE integration_formatters DROP COLUMN IF EXISTS formatter_code;
