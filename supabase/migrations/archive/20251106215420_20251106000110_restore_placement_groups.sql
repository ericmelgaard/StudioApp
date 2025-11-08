CREATE TABLE IF NOT EXISTS placement_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  parent_id uuid REFERENCES placement_groups(id) ON DELETE SET NULL,
  daypart_hours jsonb DEFAULT '{}'::jsonb,
  meal_stations text[] DEFAULT ARRAY[]::text[],
  templates jsonb DEFAULT '{}'::jsonb,
  nfc_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_placement_groups_name ON placement_groups(name);
CREATE INDEX IF NOT EXISTS idx_placement_groups_parent_id ON placement_groups(parent_id);

ALTER TABLE placement_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read placement groups" ON placement_groups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert placement groups" ON placement_groups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update placement groups" ON placement_groups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete placement groups" ON placement_groups FOR DELETE TO anon, authenticated USING (name != '36355 - WAND Digital Demo');

INSERT INTO placement_groups (name, description, parent_id, daypart_hours, meal_stations, templates, nfc_url)
SELECT '36355 - WAND Digital Demo', 'Default store placement group', NULL, '{}'::jsonb, ARRAY[]::text[], '{}'::jsonb, NULL
WHERE NOT EXISTS (SELECT 1 FROM placement_groups WHERE name = '36355 - WAND Digital Demo');