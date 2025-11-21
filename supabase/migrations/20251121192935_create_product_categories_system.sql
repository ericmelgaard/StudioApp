/*
  # Create Product Categories System

  1. New Tables
    - `product_categories`
      - `id` (uuid, primary key) - Unique identifier for each category
      - `name` (text, not null) - Original category name (from integration or manual)
      - `display_name` (text, nullable) - Editable display name that overrides the original
      - `description` (text, nullable) - Category description
      - `parent_category_id` (uuid, nullable) - For hierarchical categories
      - `sort_order` (integer, default 0) - Custom ordering
      - `translations` (jsonb, default '[]') - Multi-language support
      - `integration_source_id` (uuid, nullable) - Links to wand_integration_sources if imported
      - `integration_category_id` (text, nullable) - Original category ID from external system
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `product_category_assignments`
      - `id` (uuid, primary key) - Unique identifier
      - `product_id` (uuid, not null) - Links to products table
      - `category_id` (uuid, not null) - Links to product_categories table
      - `created_at` (timestamptz) - Assignment timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read and manage categories
    - Authenticated users can manage category assignments

  3. Indexes
    - Index on product_categories.integration_source_id for integration lookups
    - Index on product_categories.parent_category_id for hierarchy queries
    - Composite unique index on product_category_assignments(product_id, category_id)
    - Index on product_category_assignments.category_id for reverse lookups

  4. Foreign Keys
    - product_categories.parent_category_id references product_categories(id)
    - product_categories.integration_source_id references wand_integration_sources(id)
    - product_category_assignments.product_id references products(id) ON DELETE CASCADE
    - product_category_assignments.category_id references product_categories(id) ON DELETE CASCADE
*/

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text,
  description text,
  parent_category_id uuid,
  sort_order integer DEFAULT 0,
  translations jsonb DEFAULT '[]',
  integration_source_id uuid,
  integration_category_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_category_assignments table
CREATE TABLE IF NOT EXISTS product_category_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Add foreign key constraints
ALTER TABLE product_categories
  ADD CONSTRAINT fk_parent_category
  FOREIGN KEY (parent_category_id)
  REFERENCES product_categories(id)
  ON DELETE SET NULL;

ALTER TABLE product_categories
  ADD CONSTRAINT fk_integration_source
  FOREIGN KEY (integration_source_id)
  REFERENCES wand_integration_sources(id)
  ON DELETE SET NULL;

ALTER TABLE product_category_assignments
  ADD CONSTRAINT fk_product
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE CASCADE;

ALTER TABLE product_category_assignments
  ADD CONSTRAINT fk_category
  FOREIGN KEY (category_id)
  REFERENCES product_categories(id)
  ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_integration_source
  ON product_categories(integration_source_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_parent
  ON product_categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_sort
  ON product_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_product_category_assignments_product
  ON product_category_assignments(product_id);

CREATE INDEX IF NOT EXISTS idx_product_category_assignments_category
  ON product_category_assignments(category_id);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_category_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Users can view all categories"
  ON product_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create categories"
  ON product_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update categories"
  ON product_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete categories"
  ON product_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for product_category_assignments
CREATE POLICY "Users can view all category assignments"
  ON product_category_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create category assignments"
  ON product_category_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update category assignments"
  ON product_category_assignments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete category assignments"
  ON product_category_assignments
  FOR DELETE
  TO authenticated
  USING (true);
