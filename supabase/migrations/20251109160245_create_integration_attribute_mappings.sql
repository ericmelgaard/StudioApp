/*
  # Create Integration Attribute Mappings Table

  1. New Tables
    - `integration_attribute_mappings`
      - `id` (uuid, primary key)
      - `wand_integration_source_id` (uuid) - Reference to WAND-level integration source template
      - `integration_type` (text) - Type of integration (e.g., 'Products', 'Modifiers', 'Discounts')
      - `product_attribute_template_id` (uuid) - Reference to target product template
      - `field_mappings` (jsonb) - JSON object mapping source fields to template attributes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `integration_attribute_mappings` table
    - Add policies for full CRUD access (demo mode)

  3. Important Notes
    - This table stores WAND-level reusable mappings
    - Maps integration source fields to product template attributes
    - Used as templates that can be inherited by organizations
    - field_mappings format: {"source_field": "template_attribute", ...}
    - Example: {"item_name": "name", "item_price": "price", "calorie_count": "calories"}
*/

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
CREATE INDEX IF NOT EXISTS idx_integration_attribute_mappings_type ON integration_attribute_mappings(integration_type);

ALTER TABLE integration_attribute_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration attribute mappings" ON integration_attribute_mappings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration attribute mappings" ON integration_attribute_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integration attribute mappings" ON integration_attribute_mappings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete integration attribute mappings" ON integration_attribute_mappings FOR DELETE USING (true);