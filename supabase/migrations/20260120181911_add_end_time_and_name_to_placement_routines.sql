/*
  # Add End Time and Schedule Name to Placement Routines

  1. Changes
    - Add `end_time` field to placement_routines for consistency with daypart schedules
    - Add `schedule_name` field for optional naming of schedules
    - These fields make the placement routine UI more consistent with daypart management

  2. Notes
    - end_time is nullable for backwards compatibility
    - schedule_name is nullable and optional
*/

-- Add end_time and schedule_name fields
ALTER TABLE placement_routines
ADD COLUMN IF NOT EXISTS end_time time,
ADD COLUMN IF NOT EXISTS schedule_name text;

-- Add comment explaining the fields
COMMENT ON COLUMN placement_routines.end_time IS 'Optional end time for the routine. If null, routine runs until next routine starts.';
COMMENT ON COLUMN placement_routines.schedule_name IS 'Optional descriptive name for the schedule (e.g., "Weekend Breakfast", "Holiday Hours")';
