/*
  # Consolidate Daypart Routines Tables

  1. Changes
    - Migrate all data from `site_daypart_routines` to `placement_daypart_overrides`
    - Drop `site_daypart_routines` table (duplicate table with identical schema)
    - Remove associated triggers and functions for site_daypart_routines
    - Keep placement_daypart_overrides as the single source of truth for all daypart schedules

  2. Rationale
    - Both tables had identical schemas and referenced the same placement_groups
    - Having two tables for the same data caused inconsistency between Admin and Operator views
    - Consolidating eliminates data fragmentation and simplifies the architecture
*/

-- Migrate all data from site_daypart_routines to placement_daypart_overrides
INSERT INTO placement_daypart_overrides (
  id,
  placement_group_id,
  daypart_name,
  days_of_week,
  start_time,
  end_time,
  created_at,
  updated_at
)
SELECT 
  id,
  placement_group_id,
  daypart_name,
  days_of_week,
  start_time,
  end_time,
  created_at,
  updated_at
FROM site_daypart_routines
ON CONFLICT (id) DO NOTHING;

-- Drop the trigger first
DROP TRIGGER IF EXISTS check_site_daypart_routine_collision ON site_daypart_routines;

-- Drop the function
DROP FUNCTION IF EXISTS check_site_daypart_collision();

-- Drop the old table
DROP TABLE IF EXISTS site_daypart_routines;
