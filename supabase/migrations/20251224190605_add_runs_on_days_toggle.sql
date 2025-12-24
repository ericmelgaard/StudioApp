/*
  # Add "Runs on Days" Toggle for Schedules

  1. Changes
    - Add `runs_on_days` boolean column (default true) to schedule tables:
      - `store_operation_hours_schedules`
      - `daypart_schedules`
      - `site_daypart_routines`
      - `placement_daypart_overrides`

    - Make time columns nullable where needed:
      - `daypart_schedules`: start_time and end_time
      - `site_daypart_routines`: start_time and end_time
      - `placement_daypart_overrides`: start_time and end_time
      (store_operation_hours_schedules already has nullable times)

    - Update CHECK constraints to allow null times when runs_on_days = false
    - Allow midnight crossing (start_time > end_time for schedules that cross midnight)

  2. Use Case
    - When runs_on_days = false, the schedule marks days where the schedule does not activate
    - For example: Power save mode doesn't run on weekends (open 24/7), so those days
      are marked with runs_on_days = false and null times
*/

-- Step 1: Add runs_on_days columns
ALTER TABLE store_operation_hours_schedules
ADD COLUMN IF NOT EXISTS runs_on_days boolean DEFAULT true;

ALTER TABLE daypart_schedules
ADD COLUMN IF NOT EXISTS runs_on_days boolean DEFAULT true;

ALTER TABLE site_daypart_routines
ADD COLUMN IF NOT EXISTS runs_on_days boolean DEFAULT true;

ALTER TABLE placement_daypart_overrides
ADD COLUMN IF NOT EXISTS runs_on_days boolean DEFAULT true;

-- Step 2: Make time columns nullable
ALTER TABLE daypart_schedules
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

ALTER TABLE site_daypart_routines
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

ALTER TABLE placement_daypart_overrides
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

-- Step 3: Update existing rows to ensure consistency
-- If times are null, set runs_on_days to false
UPDATE daypart_schedules
SET runs_on_days = false
WHERE start_time IS NULL OR end_time IS NULL;

UPDATE site_daypart_routines
SET runs_on_days = false
WHERE start_time IS NULL OR end_time IS NULL;

UPDATE placement_daypart_overrides
SET runs_on_days = false
WHERE start_time IS NULL OR end_time IS NULL;

-- Step 4: Drop old CHECK constraints
ALTER TABLE site_daypart_routines
DROP CONSTRAINT IF EXISTS site_daypart_routines_start_time_check,
DROP CONSTRAINT IF EXISTS site_daypart_routines_check;

ALTER TABLE placement_daypart_overrides
DROP CONSTRAINT IF EXISTS placement_daypart_overrides_start_time_check,
DROP CONSTRAINT IF EXISTS placement_daypart_overrides_check;

-- Step 5: Add new CHECK constraints
-- Allow midnight crossing (start_time != end_time) or null times when runs_on_days = false
ALTER TABLE site_daypart_routines
ADD CONSTRAINT check_site_daypart_routines_times CHECK (
  (runs_on_days = true AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time != end_time)
  OR
  (runs_on_days = false AND start_time IS NULL AND end_time IS NULL)
);

ALTER TABLE placement_daypart_overrides
ADD CONSTRAINT check_placement_daypart_overrides_times CHECK (
  (runs_on_days = true AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time != end_time)
  OR
  (runs_on_days = false AND start_time IS NULL AND end_time IS NULL)
);

ALTER TABLE daypart_schedules
ADD CONSTRAINT check_daypart_schedules_times CHECK (
  (runs_on_days = true AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time != end_time)
  OR
  (runs_on_days = false AND start_time IS NULL AND end_time IS NULL)
);
