/*
  # Create Daypart Time Groups System

  1. New Tables
    - `daypart_time_groups`
      - Stores time groups for daypart definitions
      - Each group represents a set of days with shared hours

  2. Migration Strategy
    - Creates new table alongside existing daypart_day_configurations
    - Does not drop old table immediately (allows rollback)

  3. Security
    - Enable RLS
    - Admin-only write access
    - All authenticated users can read
*/

CREATE TABLE IF NOT EXISTS daypart_time_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daypart_definition_id uuid NOT NULL REFERENCES daypart_definitions(id) ON DELETE CASCADE,
  days_of_week integer[] NOT NULL CHECK (array_length(days_of_week, 1) > 0),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daypart_time_groups_definition
  ON daypart_time_groups(daypart_definition_id);

CREATE INDEX IF NOT EXISTS idx_daypart_time_groups_days
  ON daypart_time_groups USING GIN (days_of_week);

ALTER TABLE daypart_time_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view time groups"
  ON daypart_time_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert time groups"
  ON daypart_time_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update time groups"
  ON daypart_time_groups FOR UPDATE
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

CREATE POLICY "Admin users can delete time groups"
  ON daypart_time_groups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON TABLE daypart_day_configurations IS
  'DEPRECATED: This table is replaced by daypart_time_groups. Kept for backward compatibility only.';