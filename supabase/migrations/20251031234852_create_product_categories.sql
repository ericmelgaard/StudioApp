/*
  # Create Product Categories System

  1. New Tables
    - `product_categories`
      - `id` (uuid, primary key)
      - `name` (text, category name)
      - `description` (text, optional description)
      - `parent_category_id` (uuid, nullable, for hierarchical categories)
      - `sort_order` (integer, for custom ordering)
      - `translations` (jsonb, stores translations for name/description)
      - `integration_source_id` (uuid, nullable, if synced from API)
      - `integration_category_id` (text, nullable, external category ID)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `product_category_assignments`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `category_id` (uuid, references product_categories)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage categories
    - Add policies for category assignments
  
  3. Indexes
    - Index on parent_category_id for hierarchy queries
    - Index on product_id and category_id for assignments
    - Index on integration fields for sync operations
*/

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES product_categories(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  translations jsonb DEFAULT '[]'::jsonb,
  integration_source_id uuid REFERENCES integration_sources(id) ON DELETE SET NULL,
  integration_category_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_category_assignments table
CREATE TABLE IF NOT EXISTS product_category_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_integration ON product_categories(integration_source_id, integration_category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_assignments_product ON product_category_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_assignments_category ON product_category_assignments(category_id);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_category_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Anyone can view categories"
  ON product_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON product_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON product_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON product_categories FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for product_category_assignments
CREATE POLICY "Anyone can view category assignments"
  ON product_category_assignments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can assign categories"
  ON product_category_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update category assignments"
  ON product_category_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can remove category assignments"
  ON product_category_assignments FOR DELETE
  TO authenticated
  USING (true);
