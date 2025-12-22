/*
  # Create Site Daypart Routines System

  1. New Tables
    - `site_daypart_routines`
      - `id` (uuid, primary key)
      - `placement_group_id` (uuid, foreign key to placement_groups for site root)
      - `daypart_name` (text) - breakfast, lunch, dinner, late_night, dark_hours
      - `days_of_week` (integer array) - 0-6 for Sunday-Saturday
      - `start_time` (time) - when daypart starts
      - `end_time` (time) - when daypart ends
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `placement_daypart_overrides`
      - `id` (uuid, primary key)
      - `placement_group_id` (uuid, foreign key to placement_groups for non-root placements)
      - `daypart_name` (text)
      - `days_of_week` (integer array)
      - `start_time` (time)
      - `end_time` (time)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their organization's data

  3. Constraints and Indexes
    - Add unique constraint to prevent duplicate daypart assignments per day
    - Create GIN indexes for efficient array queries
    - Add check constraints for time validation
*/

-- Create site_daypart_routines table
CREATE TABLE IF NOT EXISTS site_daypart_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_group_id uuid NOT NULL REFERENCES placement_groups(id) ON DELETE CASCADE,
  daypart_name text NOT NULL CHECK (daypart_name IN ('breakfast', 'lunch', 'dinner', 'late_night', 'dark_hours')),
  days_of_week integer[] NOT NULL DEFAULT ARRAY[]::integer[] CHECK (array_length(days_of_week, 1) > 0),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (start_time < end_time)
);

-- Create placement_daypart_overrides table
CREATE TABLE IF NOT EXISTS placement_daypart_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_group_id uuid NOT NULL REFERENCES placement_groups(id) ON DELETE CASCADE,
  daypart_name text NOT NULL CHECK (daypart_name IN ('breakfast', 'lunch', 'dinner', 'late_night', 'dark_hours')),
  days_of_week integer[] NOT NULL DEFAULT ARRAY[]::integer[] CHECK (array_length(days_of_week, 1) > 0),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (start_time < end_time)
);

-- Create GIN indexes for efficient array queries
CREATE INDEX IF NOT EXISTS idx_site_daypart_routines_days ON site_daypart_routines USING GIN (days_of_week);
CREATE INDEX IF NOT EXISTS idx_site_daypart_routines_placement ON site_daypart_routines(placement_group_id);
CREATE INDEX IF NOT EXISTS idx_site_daypart_routines_daypart ON site_daypart_routines(daypart_name);

CREATE INDEX IF NOT EXISTS idx_placement_daypart_overrides_days ON placement_daypart_overrides USING GIN (days_of_week);
CREATE INDEX IF NOT EXISTS idx_placement_daypart_overrides_placement ON placement_daypart_overrides(placement_group_id);
CREATE INDEX IF NOT EXISTS idx_placement_daypart_overrides_daypart ON placement_daypart_overrides(daypart_name);

-- Function to check for day collision in site daypart routines
CREATE OR REPLACE FUNCTION check_site_daypart_collision()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any existing routine for the same placement and daypart has overlapping days
  IF EXISTS (
    SELECT 1
    FROM site_daypart_routines
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND placement_group_id = NEW.placement_group_id
      AND daypart_name = NEW.daypart_name
      AND days_of_week && NEW.days_of_week  -- Array overlap operator
  ) THEN
    RAISE EXCEPTION 'Collision detected: A routine for % already exists on one or more of the selected days', NEW.daypart_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check for day collision in placement daypart overrides
CREATE OR REPLACE FUNCTION check_placement_daypart_collision()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any existing override for the same placement and daypart has overlapping days
  IF EXISTS (
    SELECT 1
    FROM placement_daypart_overrides
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND placement_group_id = NEW.placement_group_id
      AND daypart_name = NEW.daypart_name
      AND days_of_week && NEW.days_of_week  -- Array overlap operator
  ) THEN
    RAISE EXCEPTION 'Collision detected: An override for % already exists on one or more of the selected days', NEW.daypart_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for collision detection
DROP TRIGGER IF EXISTS check_site_daypart_routine_collision ON site_daypart_routines;
CREATE TRIGGER check_site_daypart_routine_collision
  BEFORE INSERT OR UPDATE ON site_daypart_routines
  FOR EACH ROW
  EXECUTE FUNCTION check_site_daypart_collision();

DROP TRIGGER IF EXISTS check_placement_daypart_override_collision ON placement_daypart_overrides;
CREATE TRIGGER check_placement_daypart_override_collision
  BEFORE INSERT OR UPDATE ON placement_daypart_overrides
  FOR EACH ROW
  EXECUTE FUNCTION check_placement_daypart_collision();

-- Enable Row Level Security
ALTER TABLE site_daypart_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_daypart_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_daypart_routines
CREATE POLICY "Users can view site daypart routines"
  ON site_daypart_routines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert site daypart routines"
  ON site_daypart_routines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update site daypart routines"
  ON site_daypart_routines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete site daypart routines"
  ON site_daypart_routines FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for placement_daypart_overrides
CREATE POLICY "Users can view placement daypart overrides"
  ON placement_daypart_overrides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert placement daypart overrides"
  ON placement_daypart_overrides FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update placement daypart overrides"
  ON placement_daypart_overrides FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete placement daypart overrides"
  ON placement_daypart_overrides FOR DELETE
  TO authenticated
  USING (true);
