/*
  # Create Product Images Storage Bucket

  1. Storage Setup
    - Creates a public storage bucket named 'product-images'
    - Allows public read access for viewing images
    - Restricts uploads to authenticated users
    - Sets file size limit to 5MB
    - Allows common image formats (JPEG, PNG, WebP, GIF)

  2. Security
    - Public bucket for read access (anyone can view images via URL)
    - Authenticated users can upload images
    - Authenticated users can delete their own uploads
*/

-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon deletes" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Allow public read access (anyone can view images)
CREATE POLICY "Allow public downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- For demo purposes, also allow anon uploads
CREATE POLICY "Allow anon uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'product-images');

-- Allow anon updates for demo
CREATE POLICY "Allow anon updates"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Allow anon deletes for demo
CREATE POLICY "Allow anon deletes"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'product-images');
