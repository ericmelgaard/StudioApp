CREATE TABLE IF NOT EXISTS integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'active',
  config jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view integration sources" ON integration_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration sources" ON integration_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integration sources" ON integration_sources FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS integration_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  path_id text,
  name text NOT NULL,
  item_type text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_id)
);

ALTER TABLE integration_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view integration products" ON integration_products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration products" ON integration_products FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS integration_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  path_id text,
  name text NOT NULL,
  modifier_group_id text,
  modifier_group_name text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_id, path_id)
);

ALTER TABLE integration_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view integration modifiers" ON integration_modifiers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration modifiers" ON integration_modifiers FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS integration_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  discount_amount numeric,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_id)
);

ALTER TABLE integration_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view integration discounts" ON integration_discounts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integration discounts" ON integration_discounts FOR INSERT WITH CHECK (true);