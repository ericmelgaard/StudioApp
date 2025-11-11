-- ============================================================================
-- COMPLETE SCHEMA CREATION FOR WAND PLATFORM
-- This migration creates all necessary tables for the WAND platform
-- ============================================================================

-- USER MANAGEMENT
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('creator', 'operator', 'admin')),
  display_name text DEFAULT '',
  location_scope_level text DEFAULT 'none',
  location_scope_concept_id bigint,
  location_scope_company_id bigint,
  location_scope_store_id bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view user profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user profiles" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user profiles" ON user_profiles FOR UPDATE USING (true) WITH CHECK (true);

-- LOCATION HIERARCHY
CREATE TABLE IF NOT EXISTS concepts (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 1,
  domain_level integer DEFAULT 2,
  group_type_string text DEFAULT '',
  parent_key bigint,
  primary_color text,
  secondary_color text,
  logo_url text,
  contact_email text,
  contact_phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  concept_id bigint REFERENCES concepts(id),
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 2,
  domain_level integer DEFAULT 4,
  group_type_string text DEFAULT '',
  parent_key bigint,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stores (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  company_id bigint REFERENCES companies(id),
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 8,
  domain_level integer DEFAULT 16,
  group_type_string text DEFAULT '',
  parent_key bigint,
  grand_parent_key bigint,
  address_line1 text,
  address_line2 text,
  city text,
  state_code text,
  postal_code text,
  country_code text,
  phone text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_concept_id ON companies(concept_id);
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON stores(company_id);

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view concepts" ON concepts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert concepts" ON concepts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update concepts" ON concepts FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert companies" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update companies" ON companies FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stores" ON stores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stores" ON stores FOR UPDATE USING (true) WITH CHECK (true);

-- PLACEMENT GROUPS
CREATE TABLE IF NOT EXISTS placement_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES placement_groups(id) ON DELETE CASCADE,
  store_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  placement_type text DEFAULT 'group',
  attributes jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE placement_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view placement groups" ON placement_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can insert placement groups" ON placement_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update placement groups" ON placement_groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete placement groups" ON placement_groups FOR DELETE USING (true);

-- PRODUCT TEMPLATES (Display templates, not attribute templates)
CREATE TABLE IF NOT EXISTS product_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  template_type text,
  dimensions jsonb DEFAULT '{}'::jsonb,
  design_data jsonb DEFAULT '{}'::jsonb,
  attributes jsonb DEFAULT '{}'::jsonb,
  preview_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view product templates" ON product_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert product templates" ON product_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product templates" ON product_templates FOR UPDATE USING (true) WITH CHECK (true);

-- PRODUCT ATTRIBUTE TEMPLATES (The critical one!)
CREATE TABLE IF NOT EXISTS product_attribute_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean DEFAULT false,
  attribute_schema jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_attribute_templates_name ON product_attribute_templates(name);

ALTER TABLE product_attribute_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view product attribute templates" ON product_attribute_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert product attribute templates" ON product_attribute_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product attribute templates" ON product_attribute_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete product attribute templates" ON product_attribute_templates FOR DELETE USING (true);

-- WAND INTEGRATION SYSTEM
CREATE TABLE IF NOT EXISTS wand_integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  integration_type text NOT NULL UNIQUE,
  description text,
  base_url_template text NOT NULL,
  auth_method text DEFAULT 'none',
  required_config_fields jsonb DEFAULT '[]'::jsonb,
  optional_config_fields jsonb DEFAULT '[]'::jsonb,
  default_sync_frequency_minutes integer DEFAULT 15,
  formatter_name text NOT NULL,
  supports_products boolean DEFAULT true,
  supports_modifiers boolean DEFAULT false,
  supports_discounts boolean DEFAULT false,
  status text DEFAULT 'active',
  api_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wand_integration_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view wand integration sources" ON wand_integration_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can insert wand integration sources" ON wand_integration_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wand integration sources" ON wand_integration_sources FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS integration_source_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  config_name text NOT NULL,
  application_level text NOT NULL,
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  company_id bigint REFERENCES companies(id) ON DELETE CASCADE,
  site_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  config_params jsonb DEFAULT '{}'::jsonb,
  sync_frequency_minutes integer,
  is_active boolean DEFAULT true,
  credentials jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_source_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view integration configs" ON integration_source_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration configs" ON integration_source_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integration configs" ON integration_source_configs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete integration configs" ON integration_source_configs FOR DELETE USING (true);

-- INTEGRATION DATA
CREATE TABLE IF NOT EXISTS integration_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid,
  source_config_id uuid REFERENCES integration_source_configs(id),
  external_id text,
  name text NOT NULL,
  description text,
  category text,
  price numeric,
  raw_data jsonb DEFAULT '{}'::jsonb,
  concept_id bigint REFERENCES concepts(id),
  company_id bigint REFERENCES companies(id),
  site_id bigint REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid,
  source_config_id uuid REFERENCES integration_source_configs(id),
  product_id uuid REFERENCES integration_products(id),
  external_id text,
  name text NOT NULL,
  price numeric,
  raw_data jsonb DEFAULT '{}'::jsonb,
  concept_id bigint REFERENCES concepts(id),
  company_id bigint REFERENCES companies(id),
  site_id bigint REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid,
  source_config_id uuid REFERENCES integration_source_configs(id),
  external_id text,
  name text NOT NULL,
  discount_type text,
  amount numeric,
  raw_data jsonb DEFAULT '{}'::jsonb,
  concept_id bigint REFERENCES concepts(id),
  company_id bigint REFERENCES companies(id),
  site_id bigint REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration products" ON integration_products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration products" ON integration_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integration products" ON integration_products FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view integration modifiers" ON integration_modifiers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration modifiers" ON integration_modifiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integration modifiers" ON integration_modifiers FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view integration discounts" ON integration_discounts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration discounts" ON integration_discounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integration discounts" ON integration_discounts FOR UPDATE USING (true) WITH CHECK (true);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  mrn uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  string_id text,
  name text NOT NULL,
  description text,
  price numeric,
  calories integer,
  sort_order integer DEFAULT 0,
  template_id uuid REFERENCES product_templates(id),
  integration_product_id uuid REFERENCES integration_products(id),
  attribute_template_id uuid REFERENCES product_attribute_templates(id),
  attributes jsonb DEFAULT '{}'::jsonb,
  attribute_mappings jsonb DEFAULT '{}'::jsonb,
  attribute_overrides jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete products" ON products FOR DELETE USING (true);

-- INTEGRATION SYNC HISTORY
CREATE TABLE IF NOT EXISTS integration_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text,
  source_config_id uuid REFERENCES integration_source_configs(id),
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  items_synced integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE integration_sync_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sync history" ON integration_sync_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sync history" ON integration_sync_history FOR INSERT WITH CHECK (true);

-- ORGANIZATION SETTINGS
CREATE TABLE IF NOT EXISTS organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  default_product_attribute_template_id uuid REFERENCES product_attribute_templates(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view organization settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert organization settings" ON organization_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update organization settings" ON organization_settings FOR UPDATE USING (true) WITH CHECK (true);

-- INTEGRATION ATTRIBUTE MAPPINGS
CREATE TABLE IF NOT EXISTS integration_attribute_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid,
  template_id uuid REFERENCES product_attribute_templates(id),
  mapping_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_attribute_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view attribute mappings" ON integration_attribute_mappings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attribute mappings" ON integration_attribute_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update attribute mappings" ON integration_attribute_mappings FOR UPDATE USING (true) WITH CHECK (true);

-- QU LOCATIONS
CREATE TABLE IF NOT EXISTS qu_locations (
  id bigint PRIMARY KEY,
  name text,
  address_line1 text,
  address_line2 text,
  city text,
  state_code text,
  postal_code text,
  country_code text,
  phone text,
  latitude numeric,
  longitude numeric,
  brand text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE qu_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view qu locations" ON qu_locations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert qu locations" ON qu_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update qu locations" ON qu_locations FOR UPDATE USING (true) WITH CHECK (true);

-- WAND PRODUCTS & TEMPLATES (usually empty but tables needed)
CREATE TABLE IF NOT EXISTS wand_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  attributes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wand_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wand_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wand_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view wand products" ON wand_products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert wand products" ON wand_products FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view wand templates" ON wand_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert wand templates" ON wand_templates FOR INSERT WITH CHECK (true);

-- LEGACY/UNUSED TABLES
CREATE TABLE IF NOT EXISTS integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration sources" ON integration_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can view product categories" ON product_categories FOR SELECT USING (true);