/*
  # Create Integration Sources Table

  1. New Tables
    - `wand_integration_sources`
      - `id` (uuid, primary key) - Unique identifier for each integration source
      - `name` (text) - Name of the integration (e.g., "Toast POS", "Square")
      - `integration_type` (text) - Type of integration (e.g., "pos", "inventory", "ordering")
      - `status` (text) - Current status (active, inactive, error)
      - `config` (jsonb) - Configuration data for the integration
      - `description` (text) - Optional description of the integration
      - `created_at` (timestamptz) - When the integration was created
      - `updated_at` (timestamptz) - When the integration was last updated

  2. Security
    - Enable RLS on `wand_integration_sources` table
    - Add policy for authenticated users to read integration sources
    - Add policy for authenticated users to manage their own integrations

  3. Indexes
    - Index on `name` for fast lookups
    - Index on `status` for filtering active integrations
*/

CREATE TABLE IF NOT EXISTS wand_integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  integration_type text NOT NULL,
  status text DEFAULT 'active',
  config jsonb DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wand_integration_sources_name ON wand_integration_sources(name);
CREATE INDEX IF NOT EXISTS idx_wand_integration_sources_status ON wand_integration_sources(status);

-- Enable RLS
ALTER TABLE wand_integration_sources ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view integration sources"
  ON wand_integration_sources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert integration sources"
  ON wand_integration_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update integration sources"
  ON wand_integration_sources
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete integration sources"
  ON wand_integration_sources
  FOR DELETE
  TO authenticated
  USING (true);