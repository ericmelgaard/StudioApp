-- Complete schema creation for database clone
-- This creates all tables needed based on the backup data

-- Location Hierarchy Tables
CREATE TABLE IF NOT EXISTS concepts (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  privilege_level integer DEFAULT 1,
  parent_level integer DEFAULT 1,
  domain_level integer DEFAULT 2,
  group_type_string text DEFAULT '',
  parent_key bigint,
  logo_url text,
  primary_color text,
  secondary_color text,
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
  contact_name text,
  contact_email text,
  contact_phone text,
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
  address text,
  city text,
  state text,
  zip_code text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now()
);

-- User Management
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'operator',
  company_id bigint REFERENCES companies(id),
  concept_id bigint REFERENCES concepts(id),
  store_id bigint REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Placement Groups
CREATE TABLE IF NOT EXISTS placement_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  store_id bigint REFERENCES stores(id),
  parent_id uuid REFERENCES placement_groups(id),
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product Templates
CREATE TABLE IF NOT EXISTS product_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  attributes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WAND Integration Sources
CREATE TABLE IF NOT EXISTS wand_integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  integration_type text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Integration Source Configs
CREATE TABLE IF NOT EXISTS integration_source_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_integration_source_id uuid REFERENCES wand_integration_sources(id),
  company_id bigint REFERENCES companies(id),
  concept_id bigint REFERENCES concepts(id),
  store_id bigint REFERENCES stores(id),
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Integration Products
CREATE TABLE IF NOT EXISTS integration_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_source_config_id uuid REFERENCES integration_source_configs(id),
  external_id text,
  name text,
  data jsonb DEFAULT '{}'::jsonb,
  company_id bigint REFERENCES companies(id),
  concept_id bigint REFERENCES concepts(id),
  store_id bigint REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Integration Modifiers
CREATE TABLE IF NOT EXISTS integration_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_source_config_id uuid REFERENCES integration_source_configs(id),
  external_id text,
  name text,
  data jsonb DEFAULT '{}'::jsonb,
  company_id bigint REFERENCES companies(id),
  concept_id bigint REFERENCES concepts(id),
  store_id bigint REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Integration Discounts
CREATE TABLE IF NOT EXISTS integration_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_source_config_id uuid REFERENCES integration_source_configs(id),
  external_id text,
  name text,
  data jsonb DEFAULT '{}'::jsonb,
  company_id bigint REFERENCES companies(id),
  concept_id bigint REFERENCES concepts(id),
  store_id bigint REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Integration Formatters
CREATE TABLE IF NOT EXISTS integration_formatters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_integration_source_id uuid REFERENCES wand_integration_sources(id),
  formatter_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products (empty in backup but create for completeness)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  attributes jsonb DEFAULT '{}'::jsonb,
  attribute_mappings jsonb DEFAULT '{}'::jsonb,
  attribute_overrides jsonb DEFAULT '{}'::jsonb,
  attribute_template_id uuid,
  display_template_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_concept_id ON companies(concept_id);
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON stores(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_concept_id ON user_profiles(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_store_id ON user_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_placement_groups_store_id ON placement_groups(store_id);
CREATE INDEX IF NOT EXISTS idx_integration_products_config_id ON integration_products(integration_source_config_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_config_id ON integration_modifiers(integration_source_config_id);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_config_id ON integration_discounts(integration_source_config_id);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);

-- Enable RLS on all tables
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wand_integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_source_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_formatters ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies (open for demo - allows anon access)
CREATE POLICY IF NOT EXISTS "Anyone can view concepts" ON concepts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert concepts" ON concepts FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update concepts" ON concepts FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view companies" ON companies FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert companies" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update companies" ON companies FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view stores" ON stores FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert stores" ON stores FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update stores" ON stores FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view user_profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert user_profiles" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update user_profiles" ON user_profiles FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view placement_groups" ON placement_groups FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert placement_groups" ON placement_groups FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update placement_groups" ON placement_groups FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view product_templates" ON product_templates FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert product_templates" ON product_templates FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update product_templates" ON product_templates FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view wand_integration_sources" ON wand_integration_sources FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert wand_integration_sources" ON wand_integration_sources FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update wand_integration_sources" ON wand_integration_sources FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view integration_source_configs" ON integration_source_configs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert integration_source_configs" ON integration_source_configs FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update integration_source_configs" ON integration_source_configs FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view integration_products" ON integration_products FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert integration_products" ON integration_products FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update integration_products" ON integration_products FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view integration_modifiers" ON integration_modifiers FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert integration_modifiers" ON integration_modifiers FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update integration_modifiers" ON integration_modifiers FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view integration_discounts" ON integration_discounts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert integration_discounts" ON integration_discounts FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update integration_discounts" ON integration_discounts FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view integration_formatters" ON integration_formatters FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert integration_formatters" ON integration_formatters FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update integration_formatters" ON integration_formatters FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update products" ON products FOR UPDATE USING (true);
