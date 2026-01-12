/*
  # Add Thumbnail Support to Asset Library

  ## Summary
  Adds automatic thumbnail generation support to the asset library system.

  ## Changes
    - Add `thumbnail_path` column to `asset_library` table to store thumbnail file paths
    - Thumbnails are automatically generated client-side during upload:
      - For images: Resized to 400x400px (max) maintaining aspect ratio
      - For videos: First frame extracted as thumbnail
    - Thumbnails stored separately in storage bucket under same folder structure
    - Nullable field - existing assets without thumbnails remain valid
*/

-- Add thumbnail_path column
ALTER TABLE asset_library 
ADD COLUMN IF NOT EXISTS thumbnail_path text;
