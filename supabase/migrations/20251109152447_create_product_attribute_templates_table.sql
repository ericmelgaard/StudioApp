/*
  # Create Product Attribute Templates Table

  1. New Tables
    - `product_attribute_templates`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Template name (e.g., 'QSR', 'Webtrition', 'Retail')
      - `description` (text) - Template description
      - `is_system` (boolean) - Whether this is a system-provided template
      - `attribute_schema` (jsonb) - JSON schema defining core and extended attributes
      - `created_by` (uuid) - User who created the template
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `product_attribute_templates` table
    - Add policies for full CRUD access (demo mode)

  3. Seed Data
    - Insert 4 default templates: QSR, Webtrition, Retail, Custom
    - Each template includes core_attributes and extended_attributes schemas
    - QSR template optimized for fast food/restaurant products
    - Webtrition template for nutrition/dining hall services
    - Retail template for standard retail products
    - Custom template as a minimal starting point

  4. Important Notes
    - Templates define the data structure for products
    - Core attributes are the essential fields required for all products using this template
    - Extended attributes are optional fields that can be added per-organization
    - WAND level creates/manages these global templates
    - CCS level customizes them with extended attributes and translations
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

CREATE POLICY "Anyone can view product attribute templates" ON product_attribute_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert product attribute templates" ON product_attribute_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product attribute templates" ON product_attribute_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete product attribute templates" ON product_attribute_templates FOR DELETE USING (true);

-- Insert default attribute templates
INSERT INTO product_attribute_templates (name, description, is_system, attribute_schema) VALUES
(
  'QSR',
  'Quick Service Restaurant - Standard fast food/QSR attributes',
  true,
  '{
    "core_attributes": [
      {"name": "name", "type": "richtext", "required": true, "label": "Product Name"},
      {"name": "description", "type": "richtext", "required": false, "label": "Description"},
      {"name": "price", "type": "number", "required": false, "label": "Price"},
      {"name": "calories", "type": "number", "required": false, "label": "Calories"},
      {"name": "category", "type": "text", "required": false, "label": "Category"},
      {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail", "resolution": "200x200"}
    ],
    "extended_attributes": [
      {"name": "options_label", "type": "text", "required": false, "label": "Options Label"},
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
      {"name": "name", "type": "richtext", "required": true, "label": "Product Name"},
      {"name": "description", "type": "richtext", "required": false, "label": "Description"},
      {"name": "portion", "type": "text", "required": false, "label": "Portion Size"},
      {"name": "calories", "type": "number", "required": false, "label": "Calories"},
      {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail", "resolution": "200x200"}
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
      {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail", "resolution": "200x200"}
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