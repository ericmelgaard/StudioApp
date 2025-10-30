/*
  # Create Integration Attribute Mappings
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