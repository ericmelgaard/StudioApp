/*
  # Create Integration Discounts Table

  1. New Tables
    - `integration_discounts`
      - `id` (uuid, primary key) - Unique identifier for each integration discount
      - `wand_source_id` (uuid, foreign key) - Links to wand_integration_sources
      - `external_id` (text) - The discount ID in the external system
      - `name` (text) - Discount name from external system
      - `discount_amount` (numeric) - Amount or percentage of discount
      - `discount_type` (text) - Type of discount (percentage, fixed, etc.)
      - `data` (jsonb) - Raw discount data from external system
      - `concept_id` (uuid) - Multi-tenancy: which concept this belongs to
      - `company_id` (uuid) - Multi-tenancy: which company this belongs to
      - `site_id` (uuid) - Multi-tenancy: which site this belongs to
      - `last_synced_at` (timestamptz) - When this data was last synced
      - `created_at` (timestamptz) - When this record was created
      - `updated_at` (timestamptz) - When this record was last updated

  2. Security
    - Enable RLS on `integration_discounts` table
    - Add policies for authenticated users to read and manage integration discounts

  3. Indexes
    - Index on `wand_source_id` for fast lookups by integration source
    - Index on `external_id` for fast lookups by external system ID
    - Composite index on (wand_source_id, external_id) for unique constraints
    - Index on `site_id` for multi-tenancy filtering

  4. Foreign Keys
    - Link to `wand_integration_sources` table
*/

CREATE TABLE IF NOT EXISTS integration_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text,
  discount_amount numeric,
  discount_type text,
  data jsonb DEFAULT '{}',
  concept_id uuid,
  company_id uuid,
  site_id uuid,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_discounts_source ON integration_discounts(wand_source_id);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_external_id ON integration_discounts(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_source_external ON integration_discounts(wand_source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_integration_discounts_site ON integration_discounts(site_id);

-- Enable RLS
ALTER TABLE integration_discounts ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view integration discounts"
  ON integration_discounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert integration discounts"
  ON integration_discounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update integration discounts"
  ON integration_discounts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete integration discounts"
  ON integration_discounts
  FOR DELETE
  TO authenticated
  USING (true);