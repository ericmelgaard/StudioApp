/*
  # Update Site Dayparts to Reference Global Definitions

  1. Changes
    - Remove CHECK constraints on daypart_name that limit to specific values
    - Add foreign key relationship to daypart_definitions table
    - Update site_daypart_routines to reference daypart_definition_id instead of daypart_name
    - Keep backward compatibility by allowing existing daypart_name entries

  2. Migration Strategy
    - Add new columns alongside existing ones
    - Preserve existing data
    - Update triggers to work with new structure
*/

-- Drop existing CHECK constraints
ALTER TABLE site_daypart_routines
  DROP CONSTRAINT IF EXISTS site_daypart_routines_daypart_name_check;

ALTER TABLE placement_daypart_overrides
  DROP CONSTRAINT IF EXISTS placement_daypart_overrides_daypart_name_check;

-- Add new column for daypart_definition_id (allow null during migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_daypart_routines' AND column_name = 'daypart_definition_id'
  ) THEN
    ALTER TABLE site_daypart_routines
      ADD COLUMN daypart_definition_id uuid REFERENCES daypart_definitions(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_site_daypart_routines_definition
      ON site_daypart_routines(daypart_definition_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'placement_daypart_overrides' AND column_name = 'daypart_definition_id'
  ) THEN
    ALTER TABLE placement_daypart_overrides
      ADD COLUMN daypart_definition_id uuid REFERENCES daypart_definitions(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_placement_daypart_overrides_definition
      ON placement_daypart_overrides(daypart_definition_id);
  END IF;
END $$;

-- Migrate existing data: match daypart_name to daypart_definitions.daypart_name
UPDATE site_daypart_routines sdr
SET daypart_definition_id = dd.id
FROM daypart_definitions dd
WHERE sdr.daypart_name = dd.daypart_name
  AND sdr.daypart_definition_id IS NULL;

UPDATE placement_daypart_overrides pdo
SET daypart_definition_id = dd.id
FROM daypart_definitions dd
WHERE pdo.daypart_name = dd.daypart_name
  AND pdo.daypart_definition_id IS NULL;

-- Update collision detection functions to work with daypart_definition_id
CREATE OR REPLACE FUNCTION check_site_daypart_collision()
RETURNS TRIGGER AS $$
BEGIN
  -- Check using daypart_definition_id if available, otherwise fall back to daypart_name
  IF NEW.daypart_definition_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM site_daypart_routines
      WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND placement_group_id = NEW.placement_group_id
        AND daypart_definition_id = NEW.daypart_definition_id
        AND days_of_week && NEW.days_of_week
    ) THEN
      RAISE EXCEPTION 'Collision detected: A routine for this daypart already exists on one or more of the selected days';
    END IF;
  ELSIF NEW.daypart_name IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM site_daypart_routines
      WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND placement_group_id = NEW.placement_group_id
        AND daypart_name = NEW.daypart_name
        AND days_of_week && NEW.days_of_week
    ) THEN
      RAISE EXCEPTION 'Collision detected: A routine for % already exists on one or more of the selected days', NEW.daypart_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_placement_daypart_collision()
RETURNS TRIGGER AS $$
BEGIN
  -- Check using daypart_definition_id if available, otherwise fall back to daypart_name
  IF NEW.daypart_definition_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM placement_daypart_overrides
      WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND placement_group_id = NEW.placement_group_id
        AND daypart_definition_id = NEW.daypart_definition_id
        AND days_of_week && NEW.days_of_week
    ) THEN
      RAISE EXCEPTION 'Collision detected: An override for this daypart already exists on one or more of the selected days';
    END IF;
  ELSIF NEW.daypart_name IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM placement_daypart_overrides
      WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND placement_group_id = NEW.placement_group_id
        AND daypart_name = NEW.daypart_name
        AND days_of_week && NEW.days_of_week
    ) THEN
      RAISE EXCEPTION 'Collision detected: An override for % already exists on one or more of the selected days', NEW.daypart_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;