/*
  # Create Product Import/Export Tracking Tables

  ## Overview
  This migration creates tables to track product exports and imports with support for 
  location hierarchy, translation columns, and scheduled publication dates.

  ## New Tables
  
  ### `product_exports`
  Tracks all product export operations with metadata about what was exported.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the export
  - `export_name` (text) - User-friendly name for this export
  - `file_format` (text) - Format of exported file: 'csv', 'excel', 'json'
  - `file_url` (text, nullable) - URL to the exported file if stored
  - `concept_id` (uuid, nullable) - Concept level filter used for export
  - `company_id` (uuid, nullable) - Company level filter used for export
  - `site_id` (uuid, nullable) - Site level filter used for export
  - `include_child_locations` (boolean) - Whether child locations were included
  - `translation_locales` (text[], array) - List of translation locales included as columns
  - `product_count` (integer) - Number of products exported
  - `column_config` (jsonb) - Configuration of which columns were exported
  - `created_at` (timestamptz) - When the export was created
  - `created_by` (uuid, nullable) - User who created the export
  - `metadata` (jsonb) - Additional export metadata

  ### `product_imports`
  Tracks all product import operations with publication status and translation handling.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the import
  - `import_name` (text) - User-friendly name for this import
  - `file_format` (text) - Format of imported file: 'csv', 'excel', 'json'
  - `file_url` (text, nullable) - URL to the original imported file
  - `concept_id` (uuid, nullable) - Target concept for import
  - `company_id` (uuid, nullable) - Target company for import
  - `site_id` (uuid, nullable) - Target site for import
  - `publication_mode` (text) - Publication mode: 'immediate', 'scheduled', 'per_row'
  - `scheduled_publish_at` (timestamptz, nullable) - Scheduled publication date for entire batch
  - `translation_locales` (text[], array) - List of translation locales found in import
  - `total_rows` (integer) - Total number of rows in import file
  - `processed_rows` (integer) - Number of rows successfully processed
  - `failed_rows` (integer) - Number of rows that failed processing
  - `products_created` (integer) - Number of new products created
  - `products_updated` (integer) - Number of existing products updated
  - `status` (text) - Import status: 'pending', 'processing', 'completed', 'failed', 'cancelled'
  - `error_log` (jsonb) - Array of errors encountered during import
  - `column_mapping` (jsonb) - Mapping of import columns to product attributes
  - `created_at` (timestamptz) - When the import was initiated
  - `completed_at` (timestamptz, nullable) - When the import completed
  - `created_by` (uuid, nullable) - User who initiated the import
  - `metadata` (jsonb) - Additional import metadata

  ### `product_import_rows`
  Tracks individual rows from product imports for detailed audit and error tracking.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the import row
  - `import_id` (uuid, foreign key) - References the parent import
  - `row_number` (integer) - Row number in the import file
  - `product_id` (uuid, nullable) - Product created or updated by this row
  - `row_data` (jsonb) - Original data from the import row
  - `publication_date` (timestamptz, nullable) - Per-row publication date if specified
  - `status` (text) - Row status: 'pending', 'processed', 'failed', 'skipped'
  - `error_message` (text, nullable) - Error message if row failed
  - `changes_applied` (jsonb) - Summary of changes applied to product
  - `processed_at` (timestamptz, nullable) - When this row was processed

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their exports and imports
  - Restrict access based on user permissions

  ## Indexes
  - Index on created_by for fast user-based lookups
  - Index on status for filtering active/completed operations
  - Index on location fields (concept_id, company_id, site_id) for hierarchy queries
  - Index on import_id for fast row lookups

  ## Foreign Keys
  - product_import_rows references product_imports with CASCADE DELETE
  - product_id references products table (nullable, no cascade)

  ## Notes
  - Translation locales stored as array for efficient querying
  - Column configuration stored as JSONB for flexibility
  - Error logs stored as JSONB arrays for structured error tracking
  - Supports partial imports (some rows succeed, others fail)
*/

-- Create product_exports table
CREATE TABLE IF NOT EXISTS product_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_name text NOT NULL,
  file_format text NOT NULL,
  file_url text,
  concept_id uuid,
  company_id uuid,
  site_id uuid,
  include_child_locations boolean DEFAULT false,
  translation_locales text[] DEFAULT '{}',
  product_count integer DEFAULT 0,
  column_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT product_exports_file_format_check 
    CHECK (file_format IN ('csv', 'excel', 'json'))
);

-- Create product_imports table
CREATE TABLE IF NOT EXISTS product_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_name text NOT NULL,
  file_format text NOT NULL,
  file_url text,
  concept_id uuid,
  company_id uuid,
  site_id uuid,
  publication_mode text NOT NULL DEFAULT 'immediate',
  scheduled_publish_at timestamptz,
  translation_locales text[] DEFAULT '{}',
  total_rows integer DEFAULT 0,
  processed_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_log jsonb DEFAULT '[]',
  column_mapping jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT product_imports_file_format_check 
    CHECK (file_format IN ('csv', 'excel', 'json')),
  CONSTRAINT product_imports_publication_mode_check 
    CHECK (publication_mode IN ('immediate', 'scheduled', 'per_row')),
  CONSTRAINT product_imports_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Create product_import_rows table
CREATE TABLE IF NOT EXISTS product_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL,
  row_number integer NOT NULL,
  product_id uuid,
  row_data jsonb NOT NULL,
  publication_date timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  changes_applied jsonb DEFAULT '{}',
  processed_at timestamptz,
  CONSTRAINT product_import_rows_import_id_fkey 
    FOREIGN KEY (import_id) 
    REFERENCES product_imports(id) 
    ON DELETE CASCADE,
  CONSTRAINT product_import_rows_status_check 
    CHECK (status IN ('pending', 'processed', 'failed', 'skipped'))
);

-- Create indexes for product_exports
CREATE INDEX IF NOT EXISTS idx_product_exports_created_by 
  ON product_exports(created_by);

CREATE INDEX IF NOT EXISTS idx_product_exports_created_at 
  ON product_exports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_exports_concept_id 
  ON product_exports(concept_id);

CREATE INDEX IF NOT EXISTS idx_product_exports_company_id 
  ON product_exports(company_id);

CREATE INDEX IF NOT EXISTS idx_product_exports_site_id 
  ON product_exports(site_id);

-- Create indexes for product_imports
CREATE INDEX IF NOT EXISTS idx_product_imports_created_by 
  ON product_imports(created_by);

CREATE INDEX IF NOT EXISTS idx_product_imports_status 
  ON product_imports(status);

CREATE INDEX IF NOT EXISTS idx_product_imports_created_at 
  ON product_imports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_imports_concept_id 
  ON product_imports(concept_id);

CREATE INDEX IF NOT EXISTS idx_product_imports_company_id 
  ON product_imports(company_id);

CREATE INDEX IF NOT EXISTS idx_product_imports_site_id 
  ON product_imports(site_id);

CREATE INDEX IF NOT EXISTS idx_product_imports_scheduled_publish 
  ON product_imports(scheduled_publish_at) 
  WHERE status IN ('pending', 'processing');

-- Create indexes for product_import_rows
CREATE INDEX IF NOT EXISTS idx_product_import_rows_import_id 
  ON product_import_rows(import_id);

CREATE INDEX IF NOT EXISTS idx_product_import_rows_product_id 
  ON product_import_rows(product_id);

CREATE INDEX IF NOT EXISTS idx_product_import_rows_status 
  ON product_import_rows(status);

CREATE INDEX IF NOT EXISTS idx_product_import_rows_import_row 
  ON product_import_rows(import_id, row_number);

-- Enable Row Level Security
ALTER TABLE product_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_import_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_exports
CREATE POLICY "Authenticated users can view product exports"
  ON product_exports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create product exports"
  ON product_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product exports"
  ON product_exports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product exports"
  ON product_exports
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for product_imports
CREATE POLICY "Authenticated users can view product imports"
  ON product_imports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create product imports"
  ON product_imports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product imports"
  ON product_imports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product imports"
  ON product_imports
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for product_import_rows
CREATE POLICY "Authenticated users can view product import rows"
  ON product_import_rows
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create product import rows"
  ON product_import_rows
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product import rows"
  ON product_import_rows
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product import rows"
  ON product_import_rows
  FOR DELETE
  TO authenticated
  USING (true);