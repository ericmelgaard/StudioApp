/*
  # Add Branding Fields to Concepts Table

  1. Changes to `concepts` table
    - Add `description` (text) - Long description of the concept
    - Add `icon` (text) - Lucide icon name (e.g., "Building2", "Store")
    - Add `brand_primary_color` (text) - Primary brand color in hex format (e.g., "#FF5733")
    - Add `brand_secondary_color` (text) - Secondary brand color in hex format (e.g., "#33FF57")

  2. Notes
    - All new fields are nullable (optional)
    - Icon defaults to null, will use a default icon in UI if not set
    - Brand colors default to null, will use default theme colors if not set
*/

-- Add description field to concepts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'description'
  ) THEN
    ALTER TABLE concepts ADD COLUMN description text;
  END IF;
END $$;

-- Add icon field to concepts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'icon'
  ) THEN
    ALTER TABLE concepts ADD COLUMN icon text;
  END IF;
END $$;

-- Add brand_primary_color field to concepts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'brand_primary_color'
  ) THEN
    ALTER TABLE concepts ADD COLUMN brand_primary_color text;
  END IF;
END $$;

-- Add brand_secondary_color field to concepts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'brand_secondary_color'
  ) THEN
    ALTER TABLE concepts ADD COLUMN brand_secondary_color text;
  END IF;
END $$;