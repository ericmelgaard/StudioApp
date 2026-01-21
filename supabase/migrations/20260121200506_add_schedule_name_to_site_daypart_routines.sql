/*
  # Add schedule_name to site_daypart_routines

  1. Changes
    - Add `schedule_name` column to `site_daypart_routines` table
      - Optional text field for naming site-level daypart schedules
      - Consistent with schedule_name in daypart_schedules and placement_daypart_overrides
*/

-- Add schedule_name column to site_daypart_routines
ALTER TABLE site_daypart_routines
ADD COLUMN IF NOT EXISTS schedule_name text;
