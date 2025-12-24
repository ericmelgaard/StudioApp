/*
  # Add schedule_name to placement_daypart_overrides

  1. Changes
    - Add `schedule_name` column to `placement_daypart_overrides` table
      - Optional text field for naming placement-level schedule overrides
      - Consistent with the schedule_name field in daypart_schedules
*/

-- Add schedule_name column to placement_daypart_overrides
ALTER TABLE placement_daypart_overrides
ADD COLUMN IF NOT EXISTS schedule_name text;
