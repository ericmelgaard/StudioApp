/*
  # Create Integration Sources Table
  
  1. New Tables
    - `integration_sources`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the integration (e.g., "QU POS", "Toast", "Centric OS")
      - `type` (text) - Type of integration (api, webhook, etc.)
      - `status` (text) - Status of integration (active, inactive, error)
      - `config` (jsonb) - Configuration details
      - `last_sync_at` (timestamptz) - Last sync timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on integration_sources
    - Allow anyone to view integration sources for demo purposes
    - Allow anyone to insert/update for demo purposes
*/

-- Create integration_sources table
CREATE TABLE IF NOT EXISTS integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'active',
  config jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration sources"
  ON integration_sources FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert integration sources"
  ON integration_sources FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration sources"
  ON integration_sources FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete integration sources"
  ON integration_sources FOR DELETE
  USING (true);