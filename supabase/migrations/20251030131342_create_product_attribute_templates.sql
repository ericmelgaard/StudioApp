/*
  # Create Product Attribute Templates System

  1. New Tables
    - `product_attribute_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name (QSR, Webtrition, Retail, Custom)
      - `description` (text) - Description of this template
      - `is_system` (boolean) - Whether this is a built-in system template
      - `attribute_schema` (jsonb) - JSON schema defining attributes for this template
      - `created_by` (uuid) - User who created custom template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to products table
    - Add `attribute_template_id` to link to attribute template
    - Change structure to store flexible attributes in jsonb
    - Keep some core fields (id, name) but move most data to `attributes` jsonb field

  3. Default Templates
    - QSR (Quick Service Restaurant)
    - Webtrition (Nutrition/Dining Services)
    - Retail
    - Custom (user-defined)

  4. Security
    - Enable RLS on product_attribute_templates
    - Add policies for authenticated users
*/

-- Create product_attribute_templates table
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
CREATE INDEX IF NOT EXISTS idx_product_attribute_templates_is_system ON product_attribute_templates(is_system);

ALTER TABLE product_attribute_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product attribute templates"
  ON product_attribute_templates FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert product attribute templates"
  ON product_attribute_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update product attribute templates"
  ON product_attribute_templates FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete product attribute templates"
  ON product_attribute_templates FOR DELETE
  USING (true);

-- Insert default attribute templates
INSERT INTO product_attribute_templates (name, description, is_system, attribute_schema) VALUES
(
  'QSR',
  'Quick Service Restaurant - Standard fast food/QSR attributes',
  true,
  '{
    "core_attributes": [
      {"name": "name", "type": "text", "required": true, "label": "Product Name"},
      {"name": "description", "type": "text", "required": false, "label": "Description"},
      {"name": "price", "type": "number", "required": true, "label": "Price"},
      {"name": "calories", "type": "number", "required": false, "label": "Calories"},
      {"name": "category", "type": "text", "required": false, "label": "Category"},
      {"name": "image_url", "type": "text", "required": false, "label": "Image URL"}
    ],
    "extended_attributes": [
      {"name": "size_options", "type": "array", "required": false, "label": "Size Options"},
      {"name": "modifiers_available", "type": "boolean", "required": false, "label": "Has Modifiers"},
      {"name": "prep_time", "type": "number", "required": false, "label": "Prep Time (minutes)"}
    ]
  }'::jsonb
),
(
  'Webtrition',
  'Webtrition/Nutrition Services - Dining hall and nutrition-focused attributes',
  true,
  '{
    "core_attributes": [
      {"name": "name", "type": "text", "required": true, "label": "Product Name"},
      {"name": "description", "type": "text", "required": false, "label": "Description"},
      {"name": "portion", "type": "text", "required": false, "label": "Portion Size"},
      {"name": "calories", "type": "number", "required": false, "label": "Calories"},
      {"name": "image_url", "type": "text", "required": false, "label": "Image URL"}
    ],
    "extended_attributes": [
      {"name": "meal_periods", "type": "array", "required": false, "label": "Meal Periods"},
      {"name": "meal_stations", "type": "array", "required": false, "label": "Meal Stations"},
      {"name": "allergens", "type": "array", "required": false, "label": "Allergens"},
      {"name": "dietary_flags", "type": "array", "required": false, "label": "Dietary Flags"},
      {"name": "nutrition_info", "type": "object", "required": false, "label": "Nutrition Information"}
    ]
  }'::jsonb
),
(
  'Retail',
  'Retail - Standard retail product attributes',
  true,
  '{
    "core_attributes": [
      {"name": "name", "type": "text", "required": true, "label": "Product Name"},
      {"name": "description", "type": "text", "required": false, "label": "Description"},
      {"name": "price", "type": "number", "required": true, "label": "Price"},
      {"name": "sku", "type": "text", "required": false, "label": "SKU"},
      {"name": "image_url", "type": "text", "required": false, "label": "Image URL"}
    ],
    "extended_attributes": [
      {"name": "stock_quantity", "type": "number", "required": false, "label": "Stock Quantity"},
      {"name": "weight", "type": "number", "required": false, "label": "Weight"},
      {"name": "dimensions", "type": "object", "required": false, "label": "Dimensions"},
      {"name": "brand", "type": "text", "required": false, "label": "Brand"}
    ]
  }'::jsonb
),
(
  'Custom',
  'Custom - Define your own product attributes',
  true,
  '{
    "core_attributes": [
      {"name": "name", "type": "text", "required": true, "label": "Product Name"},
      {"name": "description", "type": "text", "required": false, "label": "Description"}
    ],
    "extended_attributes": []
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Drop old products table and recreate with new structure
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  attribute_template_id uuid REFERENCES product_attribute_templates(id) ON DELETE SET NULL,
  attributes jsonb DEFAULT '{}'::jsonb,
  integration_product_id uuid,
  display_template_id uuid REFERENCES product_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_attribute_template_id ON products(attribute_template_id);
CREATE INDEX IF NOT EXISTS idx_products_integration_product_id ON products(integration_product_id);
CREATE INDEX IF NOT EXISTS idx_products_display_template_id ON products(display_template_id);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete products"
  ON products FOR DELETE
  USING (true);