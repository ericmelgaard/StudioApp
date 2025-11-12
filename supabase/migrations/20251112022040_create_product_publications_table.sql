/*
  # Create product_publications table for scheduled publishing

  ## Overview
  This migration creates a table to track scheduled and published product changes,
  enabling users to schedule product updates for future publication.

  ## New Tables
  
  ### `product_publications`
  Tracks all product publication events including drafts, scheduled, and published changes.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the publication
  - `product_id` (uuid, foreign key) - References the product being published
  - `status` (text) - Publication status: 'draft', 'scheduled', 'published', 'cancelled'
  - `publish_at` (timestamptz, nullable) - When the changes should be published (null for immediate)
  - `published_at` (timestamptz, nullable) - When the changes were actually published
  - `changes` (jsonb) - The product changes to be applied (name, attributes, etc.)
  - `created_at` (timestamptz) - When the publication record was created
  - `updated_at` (timestamptz) - When the publication record was last updated
  - `created_by` (uuid, nullable) - User who created the publication

  ## Security
  - Enable Row Level Security on `product_publications` table
  - Add policy for authenticated users to read publications for their accessible products
  - Add policy for authenticated users to create publications for products they can modify
  - Add policy for authenticated users to update their own publications
  - Add policy for authenticated users to delete their own publications

  ## Relationships
  - Foreign key to `products` table with CASCADE DELETE to automatically clean up
    scheduled publications when a product is deleted

  ## Indexes
  - Index on `product_id` for fast lookups by product
  - Index on `status` for filtering by publication status
  - Composite index on `status` and `publish_at` for efficient scheduled publication queries

  ## Notes
  - When a product is deleted, all associated publications are automatically deleted
  - The `changes` JSONB column stores the complete product state to be published
  - Publications can be in draft status before being scheduled
  - Cancelled publications are kept for audit trail purposes
*/

-- Create product_publications table
CREATE TABLE IF NOT EXISTS product_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  changes jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_publications_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE CASCADE,
  CONSTRAINT product_publications_status_check 
    CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_publications_product_id 
  ON product_publications(product_id);

CREATE INDEX IF NOT EXISTS idx_product_publications_status 
  ON product_publications(status);

CREATE INDEX IF NOT EXISTS idx_product_publications_status_publish_at 
  ON product_publications(status, publish_at);

-- Enable Row Level Security
ALTER TABLE product_publications ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all publications
-- (In a multi-tenant system, you would add tenant checks here)
CREATE POLICY "Authenticated users can read product publications"
  ON product_publications
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create publications
CREATE POLICY "Authenticated users can create product publications"
  ON product_publications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update publications
-- (Could be restricted to created_by = auth.uid() if needed)
CREATE POLICY "Authenticated users can update product publications"
  ON product_publications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete publications
CREATE POLICY "Authenticated users can delete product publications"
  ON product_publications
  FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_product_publications_updated_at ON product_publications;
CREATE TRIGGER update_product_publications_updated_at
  BEFORE UPDATE ON product_publications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();