-- Create products table
CREATE TABLE IF NOT EXISTS products (
  mrn text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id text,
  string_id text,
  name text NOT NULL,
  source_name text,
  description text,
  enticing_description text,
  portion text,
  calories text,
  price text,
  sort_order integer DEFAULT 0,
  is_combo boolean DEFAULT false,
  languages jsonb DEFAULT '{}'::jsonb,
  icons jsonb DEFAULT '[]'::jsonb,
  meal_periods jsonb DEFAULT '[]'::jsonb,
  meal_stations jsonb DEFAULT '[]'::jsonb,
  template_id uuid REFERENCES product_templates(id) ON DELETE SET NULL,
  integration_product_id uuid,
  image_url text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_meal_periods ON products USING gin(meal_periods);
CREATE INDEX IF NOT EXISTS idx_products_meal_stations ON products USING gin(meal_stations);
CREATE INDEX IF NOT EXISTS idx_products_template_id ON products(template_id);
CREATE INDEX IF NOT EXISTS idx_products_integration_product_id ON products(integration_product_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete products" ON products FOR DELETE USING (true);

-- Insert default templates
INSERT INTO product_templates (name, description, template_type, dimensions, preview_url) VALUES
  ('Standard Menu Board', 'Standard menu board layout for digital displays', 'menu_board', '{"width": 1920, "height": 1080, "orientation": "landscape"}'::jsonb, null),
  ('Shelf Label Small', 'Small shelf label for standard products', 'shelf_label', '{"width": 2.5, "height": 1.25, "unit": "inches"}'::jsonb, null),
  ('Shelf Label Large', 'Large shelf label for featured products', 'shelf_label', '{"width": 4, "height": 2, "unit": "inches"}'::jsonb, null),
  ('Digital Signage Portrait', 'Portrait orientation digital signage', 'digital_signage', '{"width": 1080, "height": 1920, "orientation": "portrait"}'::jsonb, null),
  ('Digital Signage Landscape', 'Landscape orientation digital signage', 'digital_signage', '{"width": 1920, "height": 1080, "orientation": "landscape"}'::jsonb, null)
ON CONFLICT DO NOTHING;