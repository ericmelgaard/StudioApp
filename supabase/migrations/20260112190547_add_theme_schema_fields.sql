/*
  # Add Theme Schema Fields

  1. Changes
    - Add `display_type_ids` array field to store which display types this theme supports
    - Add `daypart_ids` array field to store which dayparts this theme includes
    - These fields define the theme's schema and constrain what content can be created
    
  2. Purpose
    - Enables schema-aware theme creation where users select display types and dayparts upfront
    - Theme Builder can then filter options based on the theme's defined schema
    - Prevents accidental content creation for unsupported configurations
    
  3. Notes
    - Fields are stored as bigint arrays for efficient querying
    - NULL values indicate no schema restrictions (legacy themes)
    - Theme Builder will validate all operations against these schema constraints
*/

-- Add display_type_ids array to themes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'display_type_ids'
  ) THEN
    ALTER TABLE themes ADD COLUMN display_type_ids bigint[];
  END IF;
END $$;

-- Add daypart_ids array to themes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'daypart_ids'
  ) THEN
    ALTER TABLE themes ADD COLUMN daypart_ids bigint[];
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN themes.display_type_ids IS 'Array of display type IDs this theme supports. NULL means no restrictions.';
COMMENT ON COLUMN themes.daypart_ids IS 'Array of daypart definition IDs this theme includes. NULL means no restrictions.';
