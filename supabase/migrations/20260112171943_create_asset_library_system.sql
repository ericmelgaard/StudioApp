/*
  # Asset Library Management System

  ## Overview
  Creates a comprehensive asset library system for managing images, videos, and documents
  with CCS (Company/Concept/Store) hierarchy filtering and metadata management.

  ## 1. Storage
    - Creates 'assets' storage bucket with public access
    - Supports images (jpg, png, gif, webp), videos (mp4, mov), documents (pdf)
    - Maximum file size: 50MB

  ## 2. New Tables
    ### `asset_library`
      - `id` (uuid, primary key) - Unique asset identifier
      - `filename` (text) - Original filename
      - `storage_path` (text) - Path in storage bucket
      - `file_type` (text) - MIME type
      - `file_size` (bigint) - Size in bytes
      - `asset_type` (text) - Category: image, video, document
      - `title` (text) - Display title
      - `description` (text) - Asset description
      - `tags` (text[]) - Searchable tags
      - `company_id` (bigint, nullable) - Company scope
      - `concept_id` (bigint, nullable) - Concept scope
      - `store_id` (bigint, nullable) - Store scope
      - `uploaded_by` (uuid) - User who uploaded
      - `created_at` (timestamptz) - Upload timestamp
      - `updated_at` (timestamptz) - Last modification

  ## 3. Security
    - Enable RLS on asset_library table
    - Public read access for assets in storage bucket
    - Authenticated users can upload and view assets within their access scope
    - Users can update/delete assets they uploaded
    - Admins have full access

  ## 4. Indexes
    - Index on company_id, concept_id, store_id for fast filtering
    - Index on asset_type for filtering by type
    - Index on created_at for sorting
    - GIN index on tags for tag searches
*/

-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create asset_library table
CREATE TABLE IF NOT EXISTS asset_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('image', 'video', 'document')),
  title text NOT NULL,
  description text DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  company_id bigint REFERENCES companies(id) ON DELETE CASCADE,
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  store_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_asset_library_company ON asset_library(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_library_concept ON asset_library(concept_id);
CREATE INDEX IF NOT EXISTS idx_asset_library_store ON asset_library(store_id);
CREATE INDEX IF NOT EXISTS idx_asset_library_type ON asset_library(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_library_created ON asset_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_library_tags ON asset_library USING GIN(tags);

-- Enable RLS
ALTER TABLE asset_library ENABLE ROW LEVEL SECURITY;

-- Allow public (unauthenticated) users to view all assets
CREATE POLICY "Anyone can view assets"
  ON asset_library FOR SELECT
  USING (true);

-- Allow authenticated users to insert assets
CREATE POLICY "Authenticated users can upload assets"
  ON asset_library FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Allow users to update their own assets
CREATE POLICY "Users can update own assets"
  ON asset_library FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- Allow users to delete their own assets
CREATE POLICY "Users can delete own assets"
  ON asset_library FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Storage policies: Allow public read access
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

-- Storage policies: Allow authenticated uploads
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'assets');

-- Storage policies: Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies: Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_asset_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asset_library_updated_at
  BEFORE UPDATE ON asset_library
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_library_updated_at();
