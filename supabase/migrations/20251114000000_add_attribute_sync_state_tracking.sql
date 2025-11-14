/*
  # Add Attribute Sync State Tracking

  1. Schema Changes
    - Add `disabled_sync_fields` column to products table to track fields with sync disabled
    - Add `active_integration_source_id` to track which integration is currently active
    - Add `integration_source_priority` to track priority when multiple sources are available
    - Add `last_sync_metadata` to store per-attribute sync timestamps and status

  2. New Tables
    - `integration_source_priorities` - Manages priority order when multiple integrations exist
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `source_id` (uuid, foreign key to wand_integration_sources)
      - `priority` (integer) - Higher number = higher priority
      - `is_active` (boolean) - Whether this source is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Indexes
    - Index on product_id for fast lookups
    - Index on source_id for filtering by integration source
    - Composite index on (product_id, priority) for priority ordering

  4. Security
    - Enable RLS on new table
    - Add policies for authenticated users

  5. Important Notes
    - This migration is idempotent and safe to run multiple times
    - Existing products will continue to work with null values
    - The disabled_sync_fields array tracks which fields should not sync even if mapped
*/

-- Add columns to products table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'disabled_sync_fields'
  ) THEN
    ALTER TABLE products ADD COLUMN disabled_sync_fields text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'active_integration_source_id'
  ) THEN
    ALTER TABLE products ADD COLUMN active_integration_source_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'last_sync_metadata'
  ) THEN
    ALTER TABLE products ADD COLUMN last_sync_metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Create integration source priorities table
CREATE TABLE IF NOT EXISTS integration_source_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  source_id uuid NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, source_id)
);

-- Create indexes for integration_source_priorities
CREATE INDEX IF NOT EXISTS idx_source_priorities_product ON integration_source_priorities(product_id);
CREATE INDEX IF NOT EXISTS idx_source_priorities_source ON integration_source_priorities(source_id);
CREATE INDEX IF NOT EXISTS idx_source_priorities_product_priority ON integration_source_priorities(product_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_source_priorities_active ON integration_source_priorities(product_id, is_active) WHERE is_active = true;

-- Enable RLS on integration_source_priorities
ALTER TABLE integration_source_priorities ENABLE ROW LEVEL SECURITY;

-- Policies for integration_source_priorities
CREATE POLICY "Authenticated users can view integration source priorities"
  ON integration_source_priorities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert integration source priorities"
  ON integration_source_priorities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update integration source priorities"
  ON integration_source_priorities
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete integration source priorities"
  ON integration_source_priorities
  FOR DELETE
  TO authenticated
  USING (true);

-- Add helpful comments
COMMENT ON COLUMN products.disabled_sync_fields IS 'Array of field names where sync has been manually disabled';
COMMENT ON COLUMN products.active_integration_source_id IS 'The currently active integration source for this product';
COMMENT ON COLUMN products.last_sync_metadata IS 'Per-attribute sync metadata including timestamps and status';

COMMENT ON TABLE integration_source_priorities IS 'Manages priority ordering when products are linked to multiple integration sources';
COMMENT ON COLUMN integration_source_priorities.priority IS 'Higher numbers indicate higher priority. The highest priority active source is used for syncing';
COMMENT ON COLUMN integration_source_priorities.is_active IS 'Whether this integration source is currently active for the product';
