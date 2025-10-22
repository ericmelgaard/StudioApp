/*
  # Update Placement Groups with Hierarchical Structure and Attributes

  1. Changes
    - Add parent_id for hierarchical node structure
    - Add daypart_hours for breakfast, lunch, dinner, late night, dark hours
    - Add meal_stations array for meal station references
    - Add templates for different device sizes (will store template references)
    - Add nfc_url for placement NFC URL
    - Add indexes for performance

  2. Notes
    - parent_id creates a tree structure with inheritance
    - daypart_hours stored as JSONB for flexibility
    - meal_stations stored as text array
    - templates stored as JSONB to allow different templates per size
*/

-- Add new columns to placement_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'placement_groups' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE placement_groups ADD COLUMN parent_id uuid REFERENCES placement_groups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'placement_groups' AND column_name = 'daypart_hours'
  ) THEN
    ALTER TABLE placement_groups ADD COLUMN daypart_hours jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'placement_groups' AND column_name = 'meal_stations'
  ) THEN
    ALTER TABLE placement_groups ADD COLUMN meal_stations text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'placement_groups' AND column_name = 'templates'
  ) THEN
    ALTER TABLE placement_groups ADD COLUMN templates jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'placement_groups' AND column_name = 'nfc_url'
  ) THEN
    ALTER TABLE placement_groups ADD COLUMN nfc_url text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_placement_groups_parent_id ON placement_groups(parent_id);

-- Add constraint to prevent circular references (a group cannot be its own parent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'placement_groups_no_self_parent'
  ) THEN
    ALTER TABLE placement_groups
    ADD CONSTRAINT placement_groups_no_self_parent
    CHECK (parent_id IS NULL OR parent_id != id);
  END IF;
END $$;
