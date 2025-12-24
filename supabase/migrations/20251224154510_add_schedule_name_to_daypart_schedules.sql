/*
  # Add schedule_name to daypart_schedules

  1. Changes
    - Add `schedule_name` column to `daypart_schedules` table
      - Optional text field for naming regular schedules (e.g., "Weekday Hours", "Weekend Hours")
      - This provides user-friendly labels for schedule groups
*/

-- Add schedule_name column to daypart_schedules
ALTER TABLE daypart_schedules
ADD COLUMN IF NOT EXISTS schedule_name text;
