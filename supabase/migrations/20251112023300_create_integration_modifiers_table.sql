/*
  # Create Integration Modifiers Table

  1. New Tables
    - `integration_modifiers`
      - `id` (uuid, primary key) - Unique identifier for each integration modifier
      - `wand_source_id` (uuid, foreign key) - Links to wand_integration_sources
      - `external_id` (text) - The modifier ID in the external system
      - `name` (text) - Modifier name from external system
      - `modifier_group_name` (text) - Parent group name (e.g., "Toppings", "Sizes")
      - `data` (jsonb) - Raw modifier data from external system
      - `concept_id` (uuid) - Multi-tenancy: which concept this belongs to
      - `company_id` (uuid) - Multi-tenancy: which company this belongs to
      - `site_id` (uuid) - Multi-tenancy: which site this belongs to
      - `last_synced_at` (timestamptz) - When this data was last synced
      - `created_at` (timestamptz) - When this record was created
      - `updated_at` (timestamptz) - When this record was last updated

  2. Security
    - Enable RLS on `integration_modifiers` table
    - Add policies for authenticated users to read and manage integration modifiers

  3. Indexes
    - Index on `wand_source_id` for fast lookups by integration source
    - Index on `external_id` for fast lookups by external system ID
    - Composite index on (wand_source_id, external_id) for unique constraints
    - Index on `site_id` for multi-tenancy filtering

  4. Foreign Keys
    - Link to `wand_integration_sources` table
*/

CREATE TABLE IF NOT EXISTS integration_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text,
  modifier_group_name text,
  data jsonb DEFAULT '{}',
  concept_id uuid,
  company_id uuid,
  site_id uuid,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_source ON integration_modifiers(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_external_id ON integration_modifiers(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_source_external ON integration_modifiers(wand_source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_integration_modifiers_site ON integration_modifiers(site_id);

-- Enable RLS
ALTER TABLE integration_modifiers ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view integration modifiers"
  ON integration_modifiers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert integration modifiers"
  ON integration_modifiers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update integration modifiers"
  ON integration_modifiers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete integration modifiers"
  ON integration_modifiers
  FOR DELETE
  TO authenticated
  USING (true);