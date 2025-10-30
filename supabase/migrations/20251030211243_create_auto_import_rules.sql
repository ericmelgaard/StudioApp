/*
  # Create Auto-Import Rules for Integration Products
*/

CREATE TABLE IF NOT EXISTS integration_auto_import_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE NOT NULL,
  integration_type text NOT NULL CHECK (integration_type IN ('product', 'modifier', 'discount')),
  filter_type text NOT NULL CHECK (filter_type IN ('all', 'category', 'subcategory')),
  filter_value text,
  target_template_id uuid REFERENCES product_attribute_templates(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_import_source_id 
  ON integration_auto_import_rules(source_id);

CREATE INDEX IF NOT EXISTS idx_auto_import_active 
  ON integration_auto_import_rules(is_active);

ALTER TABLE integration_auto_import_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view auto-import rules"
  ON integration_auto_import_rules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert auto-import rules"
  ON integration_auto_import_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update auto-import rules"
  ON integration_auto_import_rules
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete auto-import rules"
  ON integration_auto_import_rules
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow public access for demo"
  ON integration_auto_import_rules
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);