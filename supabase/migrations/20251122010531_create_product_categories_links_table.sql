/*
  # Create Product Categories Links Table

  1. New Tables
    - product_categories_links
      - id (uuid, primary key) - Unique identifier for each link
      - category_id (uuid, foreign key) - Links to product_categories table
      - integration_source_id (uuid, foreign key) - Links to wand_integration_sources table
      - mapping_id (text) - The category/group ID from the integration source
      - integration_type (text) - Type of integration (qu, toast, revel, etc.)
      - is_active (boolean) - Whether this link is the active source for the category
      - sync_enabled (boolean) - Whether syncing is enabled for this link
      - price_mode (text) - How price is determined: range, direct, manual, calculation
      - price_value (numeric) - Manual price value if price_mode is manual
      - price_range_low (numeric) - Low end of price range if price_mode is range
      - price_range_high (numeric) - High end of price range if price_mode is range
      - linked_product_id (uuid) - Direct link to a product if price_mode is direct
      - price_calculation (jsonb) - Calculation config if price_mode is calculation
      - last_synced_at (timestamptz) - Last time data was synced from this source
      - sync_metadata (jsonb) - Metadata about syncing (product count, etc.)
      - created_at (timestamptz) - When the link was created
      - updated_at (timestamptz) - When the link was last updated

  2. Security
    - Enable RLS on product_categories_links table
    - Add policy for authenticated users to read all category links
    - Add policy for authenticated users to create/update/delete category links

  3. Indexes
    - Index on category_id for fast lookups
    - Index on integration_source_id for filtering by source
    - Unique constraint on (category_id, integration_source_id) to prevent duplicate links
*/

CREATE TABLE IF NOT EXISTS product_categories_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  integration_source_id uuid NOT NULL REFERENCES wand_integration_sources(id) ON DELETE CASCADE,
  mapping_id text NOT NULL,
  integration_type text NOT NULL,
  is_active boolean DEFAULT false,
  sync_enabled boolean DEFAULT true,
  price_mode text DEFAULT 'range' CHECK (price_mode IN ('range', 'direct', 'manual', 'calculation')),
  price_value numeric(10, 2),
  price_range_low numeric(10, 2),
  price_range_high numeric(10, 2),
  linked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  price_calculation jsonb DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  sync_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, integration_source_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_links_category_id ON product_categories_links(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_links_integration_source_id ON product_categories_links(integration_source_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_links_is_active ON product_categories_links(is_active) WHERE is_active = true;

ALTER TABLE product_categories_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read category links"
  ON product_categories_links
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert category links"
  ON product_categories_links
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update category links"
  ON product_categories_links
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete category links"
  ON product_categories_links
  FOR DELETE
  TO authenticated
  USING (true);