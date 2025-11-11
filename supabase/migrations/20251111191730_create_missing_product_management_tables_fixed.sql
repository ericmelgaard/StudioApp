/*
  # Create Missing Product Management Tables
  
  1. New Tables
    - product_attribute_templates - Defines attribute schemas for different product types
    - organization_settings - Organization-level configuration
    - integration_attribute_mappings - Maps integration fields to product attributes
    - product_categories - Product category hierarchy
    - product_category_assignments - Links products to categories
    - qu_locations - QU-specific location data
    - integration_sync_history - Tracks integration sync operations
  
  2. Security
    - Enable RLS on all tables
    - Add permissive policies for demo mode
*/

-- Product Attribute Templates
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

-- Organization Settings
CREATE TABLE IF NOT EXISTS organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  default_product_attribute_template_id uuid REFERENCES product_attribute_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view organization settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert organization settings" ON organization_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update organization settings" ON organization_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete organization settings" ON organization_settings FOR DELETE USING (true);

-- Integration Attribute Mappings  
CREATE TABLE IF NOT EXISTS integration_attribute_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_integration_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  integration_type text NOT NULL DEFAULT 'Products',
  product_attribute_template_id uuid REFERENCES product_attribute_templates(id) ON DELETE CASCADE,
  field_mappings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_attribute_mappings_source ON integration_attribute_mappings(wand_integration_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_attribute_mappings_template ON integration_attribute_mappings(product_attribute_template_id);

ALTER TABLE integration_attribute_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view integration attribute mappings" ON integration_attribute_mappings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration attribute mappings" ON integration_attribute_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integration attribute mappings" ON integration_attribute_mappings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete integration attribute mappings" ON integration_attribute_mappings FOR DELETE USING (true);

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES product_categories(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  translations jsonb DEFAULT '[]'::jsonb,
  integration_source_id uuid,
  integration_category_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_category_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert categories" ON product_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update categories" ON product_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete categories" ON product_categories FOR DELETE USING (true);

-- Product Category Assignments
CREATE TABLE IF NOT EXISTS product_category_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_category_assignments_product ON product_category_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_assignments_category ON product_category_assignments(category_id);

ALTER TABLE product_category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view category assignments" ON product_category_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert category assignments" ON product_category_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update category assignments" ON product_category_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete category assignments" ON product_category_assignments FOR DELETE USING (true);

-- QU Locations
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

-- Integration Sync History
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
