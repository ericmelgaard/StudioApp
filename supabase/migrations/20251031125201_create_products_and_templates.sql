-- Create product_templates table
CREATE TABLE IF NOT EXISTS product_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type text NOT NULL,
  dimensions jsonb DEFAULT '{}'::jsonb,
  design_data jsonb DEFAULT '{}'::jsonb,
  preview_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_templates_type ON product_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_product_templates_created_by ON product_templates(created_by);

ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product templates" ON product_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert product templates" ON product_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product templates" ON product_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete product templates" ON product_templates FOR DELETE USING (true);