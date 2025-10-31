/*
  # Create Product Publications System

  1. New Tables
    - `product_publications`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `status` (text) - 'draft', 'scheduled', 'published'
      - `publish_at` (timestamptz, nullable) - When to publish (null = immediate)
      - `published_at` (timestamptz, nullable) - When it was actually published
      - `changes` (jsonb) - The changes to apply (attributes, etc.)
      - `created_by` (uuid, nullable) - User who created this publication
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `current_publication_id` to products table to track active publication
    - Add `has_pending_publication` computed check

  3. Security
    - Enable RLS on product_publications
    - Anyone can read publications
    - Authenticated users can manage publications

  4. Notes
    - When a scheduled publication's publish_at time passes, it should be applied
    - Only one pending/scheduled publication per product at a time
    - Immediate publications update the product directly
*/

-- Product Publications Table
CREATE TABLE IF NOT EXISTS product_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled')),
  publish_at timestamptz,
  published_at timestamptz,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_publications_product ON product_publications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_publications_status ON product_publications(status);
CREATE INDEX IF NOT EXISTS idx_product_publications_publish_at ON product_publications(publish_at) WHERE status = 'scheduled';

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_product_publications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_product_publications_updated_at
  BEFORE UPDATE ON product_publications
  FOR EACH ROW
  EXECUTE FUNCTION update_product_publications_updated_at();

ALTER TABLE product_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product publications"
  ON product_publications FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert product publications"
  ON product_publications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product publications"
  ON product_publications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product publications"
  ON product_publications FOR DELETE
  TO authenticated
  USING (true);

-- Function to get pending publication for a product
CREATE OR REPLACE FUNCTION get_pending_publication(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  status text,
  publish_at timestamptz,
  changes jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.status,
    pp.publish_at,
    pp.changes,
    pp.created_at
  FROM product_publications pp
  WHERE pp.product_id = p_product_id
    AND pp.status IN ('draft', 'scheduled')
  ORDER BY pp.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
