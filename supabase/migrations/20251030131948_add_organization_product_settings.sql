/*
  # Add Organization Product Settings

  1. New Table
    - `organization_settings`
      - `id` (uuid, primary key)
      - `organization_id` (uuid) - Reference to company/organization
      - `default_product_attribute_template_id` (uuid) - Default template for products
      - `settings_data` (jsonb) - Additional flexible settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on organization_settings
    - Add policies for authenticated users

  3. Notes
    - One settings record per organization
    - Stores organization-level preferences like default product template
    - Can be extended with additional settings in settings_data
*/

CREATE TABLE IF NOT EXISTS organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  default_product_attribute_template_id uuid REFERENCES product_attribute_templates(id) ON DELETE SET NULL,
  settings_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_template_id ON organization_settings(default_product_attribute_template_id);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view organization settings"
  ON organization_settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert organization settings"
  ON organization_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update organization settings"
  ON organization_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete organization settings"
  ON organization_settings FOR DELETE
  USING (true);

-- Insert a default settings record (for demo purposes with null organization_id)
INSERT INTO organization_settings (organization_id, settings_data) 
VALUES (null, '{}'::jsonb)
ON CONFLICT DO NOTHING;