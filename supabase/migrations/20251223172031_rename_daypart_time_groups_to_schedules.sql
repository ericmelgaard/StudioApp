/*
  # Rename daypart_time_groups to daypart_schedules

  1. Changes
    - Rename table `daypart_time_groups` to `daypart_schedules`
    - Update all indexes to use new table name
    - Preserve all existing RLS policies with updated names
    - This is part of unifying schedule terminology across all daypart levels

  2. Security
    - All existing RLS policies are preserved with updated names
*/

-- Rename the table
ALTER TABLE IF EXISTS daypart_time_groups RENAME TO daypart_schedules;

-- Rename indexes
ALTER INDEX IF EXISTS idx_daypart_time_groups_definition
  RENAME TO idx_daypart_schedules_definition;

ALTER INDEX IF EXISTS idx_daypart_time_groups_days
  RENAME TO idx_daypart_schedules_days;

-- Drop old policies
DROP POLICY IF EXISTS "All authenticated users can view time groups" ON daypart_schedules;
DROP POLICY IF EXISTS "Admin users can insert time groups" ON daypart_schedules;
DROP POLICY IF EXISTS "Admin users can update time groups" ON daypart_schedules;
DROP POLICY IF EXISTS "Admin users can delete time groups" ON daypart_schedules;

-- Recreate policies with new names
CREATE POLICY "All authenticated users can view schedules"
  ON daypart_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert schedules"
  ON daypart_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update schedules"
  ON daypart_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete schedules"
  ON daypart_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
