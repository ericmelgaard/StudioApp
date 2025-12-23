/*
  # Create Daypart Day Configurations System

  1. New Tables
    - `daypart_day_configurations`
      - `id` (uuid, primary key)
      - `daypart_definition_id` (uuid) - References daypart_definitions
      - `day_of_week` (integer) - Day number (0-6, Sunday=0)
      - `start_time` (time) - Start time for this specific day
      - `end_time` (time) - End time for this specific day
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Unique constraint on (daypart_definition_id, day_of_week)
    - Check constraint that day_of_week is between 0 and 6

  3. Security
    - Enable RLS
    - All authenticated users can view day configurations
    - Only admins can manage day configurations

  4. Purpose
    - Allows override of default times for specific days
    - If a day has a configuration, use it; otherwise fall back to default times
    - Supports different hours for weekends, specific weekdays, etc.
*/

-- Create daypart_day_configurations table
CREATE TABLE IF NOT EXISTS daypart_day_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daypart_definition_id uuid NOT NULL REFERENCES daypart_definitions(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(daypart_definition_id, day_of_week)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daypart_day_configs_definition ON daypart_day_configurations(daypart_definition_id);
CREATE INDEX IF NOT EXISTS idx_daypart_day_configs_day ON daypart_day_configurations(day_of_week);

-- Enable Row Level Security
ALTER TABLE daypart_day_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view day configurations"
  ON daypart_day_configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert day configurations"
  ON daypart_day_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update day configurations"
  ON daypart_day_configurations FOR UPDATE
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

CREATE POLICY "Admin users can delete day configurations"
  ON daypart_day_configurations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );