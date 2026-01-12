/*
  # Rename Thumbnail to Preview Image

  ## Summary
  Renames "thumbnail" terminology to "preview" throughout the asset library system
  to better reflect the actual size (400px) which is more of a preview/display image
  than a traditional thumbnail.

  ## Changes
    - Rename `thumbnail_path` column to `preview_path` in `asset_library` table
*/

-- Rename column from thumbnail_path to preview_path
ALTER TABLE asset_library 
RENAME COLUMN thumbnail_path TO preview_path;
