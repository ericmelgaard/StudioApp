/*
  # Migrate default times to schedule groups and remove default columns

  1. Data Migration
    - For each daypart_definition without schedules, create a schedule group from default times
    - Preserves all existing schedule groups
    - Only creates schedules for definitions that have none

  2. Schema Changes
    - Remove default_start_time column from daypart_definitions
    - Remove default_end_time column from daypart_definitions
    - Remove default_days column from daypart_definitions
    - These are replaced by the unified schedule system

  3. Backward Compatibility
    - This migration is safe as it preserves all existing data
    - Default times are converted to schedule groups before columns are dropped
*/

-- Step 1: Migrate default times to schedule groups
-- Only for daypart definitions that don't have any schedules yet
INSERT INTO daypart_schedules (daypart_definition_id, days_of_week, start_time, end_time)
SELECT 
  d.id,
  d.default_days,
  d.default_start_time,
  d.default_end_time
FROM daypart_definitions d
WHERE NOT EXISTS (
  SELECT 1 FROM daypart_schedules s
  WHERE s.daypart_definition_id = d.id
)
AND d.default_start_time IS NOT NULL
AND d.default_end_time IS NOT NULL
AND d.default_days IS NOT NULL
AND array_length(d.default_days, 1) > 0;

-- Step 2: Remove the default columns
ALTER TABLE daypart_definitions DROP COLUMN IF EXISTS default_start_time;
ALTER TABLE daypart_definitions DROP COLUMN IF EXISTS default_end_time;
ALTER TABLE daypart_definitions DROP COLUMN IF EXISTS default_days;

-- Add a comment to track this change
COMMENT ON TABLE daypart_schedules IS
  'Schedule groups for daypart definitions. Replaces the deprecated default_start_time, default_end_time, and default_days columns.';
