/*
  # Create Integration Auto Import Rules Table

  1. New Tables
    - `integration_auto_import_rules`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Name of the auto-import rule
      - `description` (text) - Description of what this rule does
      - `wand_source_id` (uuid, foreign key) - Links to wand_integration_sources
      - `site_id` (bigint) - Which site this rule applies to
      - `filter_rules` (jsonb) - Rules for filtering which products to import
      - `attribute_template_id` (uuid) - Default attribute template for imported products
      - `display_template_id` (uuid) - Default display template for imported products
      - `auto_publish` (boolean) - Whether to automatically publish imported products
      - `is_active` (boolean) - Whether this rule is currently active
      - `last_run_at` (timestamptz) - When this rule last ran
      - `last_run_status` (text) - Status of the last run
      - `created_at` (timestamptz) - When created
      - `updated_at` (timestamptz) - When last updated

  2. Security
    - Enable RLS on `integration_auto_import_rules` table
    - Add policies for authenticated users

  3. Indexes
    - Index on wand_source_id for lookups by integration source
    - Index on site_id for multi-tenancy filtering
    - Index on is_active for filtering active rules

  4. Foreign Keys
    - Link to wand_integration_sources table
*/

CREATE TABLE IF NOT EXISTS integration_auto_import_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  wand_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  site_id bigint,
  filter_rules jsonb DEFAULT '{}',
  attribute_template_id uuid,
  display_template_id uuid,
  auto_publish boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_auto_import_rules_source ON integration_auto_import_rules(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_auto_import_rules_site ON integration_auto_import_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_integration_auto_import_rules_active ON integration_auto_import_rules(is_active);

ALTER TABLE integration_auto_import_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view integration auto import rules"
  ON integration_auto_import_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert integration auto import rules"
  ON integration_auto_import_rules FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update integration auto import rules"
  ON integration_auto_import_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete integration auto import rules"
  ON integration_auto_import_rules FOR DELETE TO authenticated USING (true);