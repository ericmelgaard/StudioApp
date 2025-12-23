/*
  # Fix Daypart Time Groups RLS Policies

  Updates RLS policies on daypart_time_groups table to allow access without authentication,
  matching the pattern used in other daypart tables.

  This is necessary because the app does not require authentication for daypart management.
*/

DROP POLICY IF EXISTS "All authenticated users can view time groups" ON daypart_time_groups;
DROP POLICY IF EXISTS "Admin users can insert time groups" ON daypart_time_groups;
DROP POLICY IF EXISTS "Admin users can update time groups" ON daypart_time_groups;
DROP POLICY IF EXISTS "Admin users can delete time groups" ON daypart_time_groups;

CREATE POLICY "Enable all access for daypart time groups"
  ON daypart_time_groups
  FOR ALL
  USING (true)
  WITH CHECK (true);