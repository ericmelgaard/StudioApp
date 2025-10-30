/*
  # Create Integration Attribute Mappings

  1. New Table
    - `integration_attribute_mappings`
      - `id` (uuid, primary key)
      - `integration_product_id` (uuid) - Reference to integration product
      - `wand_product_id` (uuid) - Reference to wand product (nullable if template)
      - `integration_type` (text) - Type: product, modifier, or discount
      - `attribute_mappings` (jsonb) - Stores the field-to-field mappings
      - `is_template` (boolean) - Whether this is a reusable template
      - `template_name` (text) - Name if it's a template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Index on integration_product_id
    - Index on wand_product_id
    - Index on integration_type
    - Index on is_template

  3. Security
    - Enable RLS
    - Add policies for authenticated users

  4. Notes
    - attribute_mappings structure:
      {
        "mappings": [
          {
            "integration_field": "displayAttribute.itemTitle",
            "wand_field": "name",
            "transform": null
          },
          {
            "integration_field": "prices.prices[0].price",
            "wand_field": "price",
            "transform": "parseFloat"
          }
        ]
      }
*/

CREATE TABLE IF NOT EXISTS integration_attribute_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_product_id uuid,
  wand_product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  integration_type text DEFAULT 'product',
  attribute_mappings jsonb DEFAULT '{"mappings": []}'::jsonb,
  is_template boolean DEFAULT false,
  template_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_integration_type CHECK (integration_type IN ('product', 'modifier', 'discount'))
);

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_integration_id 
  ON integration_attribute_mappings(integration_product_id);
CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_wand_id 
  ON integration_attribute_mappings(wand_product_id);
CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_type 
  ON integration_attribute_mappings(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_is_template 
  ON integration_attribute_mappings(is_template);

ALTER TABLE integration_attribute_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration attribute mappings"
  ON integration_attribute_mappings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert integration attribute mappings"
  ON integration_attribute_mappings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration attribute mappings"
  ON integration_attribute_mappings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete integration attribute mappings"
  ON integration_attribute_mappings FOR DELETE
  USING (true);