/*
  # Make daypart_name Nullable in Site Daypart Tables

  1. Changes
    - Make daypart_name nullable in site_daypart_routines table
    - Make daypart_name nullable in placement_daypart_overrides table
    - Since we now use daypart_definition_id as the primary reference,
      daypart_name is only kept for backward compatibility and should be nullable

  2. Notes
    - Existing data is preserved
    - New records can use either daypart_definition_id or daypart_name
    - Collision detection functions already handle both cases
*/

-- Make daypart_name nullable in site_daypart_routines
ALTER TABLE site_daypart_routines
  ALTER COLUMN daypart_name DROP NOT NULL;

-- Make daypart_name nullable in placement_daypart_overrides
ALTER TABLE placement_daypart_overrides
  ALTER COLUMN daypart_name DROP NOT NULL;
