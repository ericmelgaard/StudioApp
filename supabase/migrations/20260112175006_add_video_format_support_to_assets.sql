/*
  # Add Video Format Support to Assets Bucket

  1. Updates
    - Adds additional video MIME types to the assets storage bucket
    - Includes: video/webm, video/x-msvideo (avi), video/mpeg, video/ogg, video/webm;codecs=vp9
  
  2. Security
    - No changes to RLS policies
    - Maintains existing access controls
*/

-- Update the assets bucket to include more video formats
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  'application/pdf'
]
WHERE id = 'assets';
