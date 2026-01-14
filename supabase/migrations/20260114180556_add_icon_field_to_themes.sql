/*
  # Add Icon Field to Themes Table

  ## Overview
  This migration adds icon support to the themes table to enable visual theme selection
  in the operator interface.

  ## Changes
  1. Add `icon` field to themes table
     - Stores a reference to an icon identifier (e.g., 'burger', 'pizza', 'coffee')
     - Optional field for custom theme branding
  
  2. Add `icon_url` field to themes table
     - Alternative to icon field for custom uploaded icon images
     - Stores URL path to custom icon asset
  
  ## Notes
  - Both fields are optional to support themes without icons
  - UI will show broken icon placeholder for themes without icon or icon_url
*/

-- Add icon field for icon identifier reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'icon'
  ) THEN
    ALTER TABLE themes ADD COLUMN icon text;
  END IF;
END $$;

-- Add icon_url field for custom icon image paths
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE themes ADD COLUMN icon_url text;
  END IF;
END $$;
