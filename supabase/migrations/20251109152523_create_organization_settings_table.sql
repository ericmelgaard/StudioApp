/*
  # Create Organization Settings Table

  1. New Tables
    - `organization_settings`
      - `id` (uuid, primary key)
      - `organization_id` (uuid) - Reference to organization/company
      - `default_product_attribute_template_id` (uuid) - Default template for products
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `organization_settings` table
    - Add policies for full CRUD access (demo mode)

  3. Important Notes
    - This table stores organization-level preferences
    - Each organization can set their default product attribute template
    - Used by CCS level to customize template selection
*/

CREATE TABLE IF NOT EXISTS organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  default_product_attribute_template_id uuid REFERENCES product_attribute_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_template_id ON organization_settings(default_product_attribute_template_id);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view organization settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert organization settings" ON organization_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update organization settings" ON organization_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete organization settings" ON organization_settings FOR DELETE USING (true);