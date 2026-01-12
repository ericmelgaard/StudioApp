/*
  # Fix Asset Storage RLS for Public Access

  ## Summary
  Updates storage bucket policies to allow public (unauthenticated) users to upload,
  update, and delete assets. This aligns with the demo environment where users
  operate without authentication.

  ## Changes
    - Drop existing restrictive storage policies
    - Add new policies allowing public access for INSERT, UPDATE, DELETE operations
    - Maintain existing public read access policy
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

-- Allow anyone to upload to assets bucket
CREATE POLICY "Anyone can upload to assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets');

-- Allow anyone to update assets
CREATE POLICY "Anyone can update assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'assets')
  WITH CHECK (bucket_id = 'assets');

-- Allow anyone to delete assets
CREATE POLICY "Anyone can delete assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'assets');
