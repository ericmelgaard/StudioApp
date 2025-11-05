/*
  # Remove Location Groups and Add WAND Library System

  ## Summary
  This migration removes the location_groups table and all group references, simplifying the hierarchy
  to WAND (library) > Concept > Company > Store. WAND acts as a central repository rather than an
  inheritance layer.

  ## Changes

  ### 1. Group Removal
    - Migrate stores under groups to their parent companies
    - Remove location_group_id column from stores table
    - Drop location_groups table entirely
    - Clean up indexes and foreign keys

  ### 2. WAND Library Tables
    - `wand_products` - Master product library available for assignment
    - `wand_templates` - Reusable template designs
    - `wand_attributes` - Attribute definitions and schemas
    - `wand_integration_sources` - Integration source templates

  ### 3. Assignment System
    - `product_assignments` - Links WAND products to CCS locations
    - `template_assignments` - Links WAND templates to CCS locations
    - Tracks assignment level (concept/company/store) and target ID

  ### 4. Inheritance Tracking
    - Add columns to products table for inheritance tracking
    - Track source of data (wand/concept/company/store)
    - Track override status at each level

  ## Security
    - Enable RLS on all new tables
    - Open policies for demo purposes (future: restrict by role)
*/

-- Step 1: Add company_id column to stores if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE stores ADD COLUMN company_id bigint REFERENCES companies(id);
  END IF;
END $$;

-- Step 2: Migrate stores from groups to companies
-- Find the company_id for each store by traversing through location_groups
UPDATE stores
SET company_id = lg.company_id
FROM location_groups lg
WHERE stores.location_group_id = lg.id
  AND stores.company_id IS NULL;

-- Step 3: For stores without location_group_id, use parent_key as company_id
UPDATE stores
SET company_id = parent_key
WHERE company_id IS NULL
  AND parent_key IS NOT NULL;

-- Step 4: Remove location_group_id column from stores
ALTER TABLE stores DROP COLUMN IF EXISTS location_group_id;

-- Step 5: Make company_id NOT NULL (all stores must belong to a company)
ALTER TABLE stores ALTER COLUMN company_id SET NOT NULL;

-- Step 6: Drop location_groups table
DROP TABLE IF EXISTS location_groups CASCADE;

-- Step 7: Create WAND library tables

-- WAND Products: Master product library
CREATE TABLE IF NOT EXISTS wand_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  category text,
  tags text[],
  base_attributes jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WAND Templates: Reusable template designs
CREATE TABLE IF NOT EXISTS wand_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type text NOT NULL CHECK (template_type IN ('qsr', 'retail', 'custom')),
  schema jsonb NOT NULL,
  preview_image_url text,
  tags text[],
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WAND Attributes: Attribute definitions and schemas
CREATE TABLE IF NOT EXISTS wand_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  data_type text NOT NULL CHECK (data_type IN ('text', 'number', 'boolean', 'image', 'richtext', 'date', 'array')),
  validation_rules jsonb DEFAULT '{}',
  default_value jsonb,
  is_required boolean DEFAULT false,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WAND Integration Sources: Integration source templates
CREATE TABLE IF NOT EXISTS wand_integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL,
  configuration jsonb DEFAULT '{}',
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 8: Create assignment tables

-- Product Assignments: Links WAND products to CCS locations
CREATE TABLE IF NOT EXISTS product_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_product_id uuid REFERENCES wand_products(id) ON DELETE CASCADE,
  assignment_level text NOT NULL CHECK (assignment_level IN ('concept', 'company', 'store')),
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  company_id bigint REFERENCES companies(id) ON DELETE CASCADE,
  store_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid,
  attribute_overrides jsonb DEFAULT '{}',
  CONSTRAINT valid_assignment CHECK (
    (assignment_level = 'concept' AND concept_id IS NOT NULL AND company_id IS NULL AND store_id IS NULL) OR
    (assignment_level = 'company' AND company_id IS NOT NULL AND concept_id IS NULL AND store_id IS NULL) OR
    (assignment_level = 'store' AND store_id IS NOT NULL AND concept_id IS NULL AND company_id IS NULL)
  ),
  UNIQUE(wand_product_id, assignment_level, concept_id, company_id, store_id)
);

-- Template Assignments: Links WAND templates to CCS locations
CREATE TABLE IF NOT EXISTS template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wand_template_id uuid REFERENCES wand_templates(id) ON DELETE CASCADE,
  assignment_level text NOT NULL CHECK (assignment_level IN ('concept', 'company', 'store')),
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  company_id bigint REFERENCES companies(id) ON DELETE CASCADE,
  store_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid,
  CONSTRAINT valid_template_assignment CHECK (
    (assignment_level = 'concept' AND concept_id IS NOT NULL AND company_id IS NULL AND store_id IS NULL) OR
    (assignment_level = 'company' AND company_id IS NOT NULL AND concept_id IS NULL AND store_id IS NULL) OR
    (assignment_level = 'store' AND store_id IS NOT NULL AND concept_id IS NULL AND company_id IS NULL)
  ),
  UNIQUE(wand_template_id, assignment_level, concept_id, company_id, store_id)
);

-- Step 9: Add inheritance tracking to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'source_level'
  ) THEN
    ALTER TABLE products ADD COLUMN source_level text CHECK (source_level IN ('wand', 'concept', 'company', 'store', 'local'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE products ADD COLUMN source_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_override'
  ) THEN
    ALTER TABLE products ADD COLUMN is_override boolean DEFAULT false;
  END IF;
END $$;

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wand_products_status ON wand_products(status);
CREATE INDEX IF NOT EXISTS idx_wand_products_category ON wand_products(category);
CREATE INDEX IF NOT EXISTS idx_wand_templates_type ON wand_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_wand_templates_status ON wand_templates(status);
CREATE INDEX IF NOT EXISTS idx_wand_attributes_category ON wand_attributes(category);

CREATE INDEX IF NOT EXISTS idx_product_assignments_wand_product ON product_assignments(wand_product_id);
CREATE INDEX IF NOT EXISTS idx_product_assignments_concept ON product_assignments(concept_id);
CREATE INDEX IF NOT EXISTS idx_product_assignments_company ON product_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_product_assignments_store ON product_assignments(store_id);
CREATE INDEX IF NOT EXISTS idx_product_assignments_level ON product_assignments(assignment_level);

CREATE INDEX IF NOT EXISTS idx_template_assignments_wand_template ON template_assignments(wand_template_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_concept ON template_assignments(concept_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_company ON template_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_store ON template_assignments(store_id);

CREATE INDEX IF NOT EXISTS idx_products_source_level ON products(source_level);

-- Step 11: Enable RLS on all new tables
ALTER TABLE wand_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wand_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wand_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wand_integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS policies (open for demo, future: restrict by role)
CREATE POLICY "Anyone can view WAND products"
  ON wand_products FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert WAND products"
  ON wand_products FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update WAND products"
  ON wand_products FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete WAND products"
  ON wand_products FOR DELETE
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view WAND templates"
  ON wand_templates FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert WAND templates"
  ON wand_templates FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update WAND templates"
  ON wand_templates FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete WAND templates"
  ON wand_templates FOR DELETE
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view WAND attributes"
  ON wand_attributes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert WAND attributes"
  ON wand_attributes FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update WAND attributes"
  ON wand_attributes FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete WAND attributes"
  ON wand_attributes FOR DELETE
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view WAND integration sources"
  ON wand_integration_sources FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert WAND integration sources"
  ON wand_integration_sources FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update WAND integration sources"
  ON wand_integration_sources FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete WAND integration sources"
  ON wand_integration_sources FOR DELETE
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view product assignments"
  ON product_assignments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert product assignments"
  ON product_assignments FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update product assignments"
  ON product_assignments FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete product assignments"
  ON product_assignments FOR DELETE
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view template assignments"
  ON template_assignments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert template assignments"
  ON template_assignments FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update template assignments"
  ON template_assignments FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete template assignments"
  ON template_assignments FOR DELETE
  TO authenticated, anon
  USING (true);
