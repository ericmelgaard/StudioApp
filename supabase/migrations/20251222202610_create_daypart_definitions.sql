/*
  # Create Global Daypart Definitions System

  1. New Tables
    - `daypart_definitions`
      - `id` (uuid, primary key)
      - `daypart_name` (text, unique) - System identifier (breakfast, lunch, etc.)
      - `display_label` (text) - Human-readable name
      - `description` (text) - Optional description
      - `color` (text) - Tailwind color class for UI
      - `default_start_time` (time) - Suggested start time
      - `default_end_time` (time) - Suggested end time
      - `default_days` (integer array) - Suggested days (0-6)
      - `icon` (text) - Icon identifier
      - `sort_order` (integer) - Display order
      - `is_active` (boolean) - Whether this daypart is available
      - `concept_id` (bigint, nullable) - Optional concept restriction
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - All authenticated users can view active dayparts
    - Only admins can manage dayparts

  3. Default Data
    - Insert standard dayparts (breakfast, lunch, dinner, late_night, dark_hours)

  Note: No time constraint to allow for overnight periods (e.g., 22:00-02:00)
*/

-- Create daypart_definitions table
CREATE TABLE IF NOT EXISTS daypart_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daypart_name text UNIQUE NOT NULL,
  display_label text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'bg-slate-100 text-slate-800 border-slate-300',
  default_start_time time NOT NULL,
  default_end_time time NOT NULL,
  default_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,0]::integer[],
  icon text DEFAULT 'Clock',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daypart_definitions_active ON daypart_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_daypart_definitions_concept ON daypart_definitions(concept_id);
CREATE INDEX IF NOT EXISTS idx_daypart_definitions_sort ON daypart_definitions(sort_order);

-- Enable Row Level Security
ALTER TABLE daypart_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view active dayparts"
  ON daypart_definitions FOR SELECT
  TO authenticated
  USING (is_active = true OR concept_id IS NULL);

CREATE POLICY "Admin users can insert daypart definitions"
  ON daypart_definitions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update daypart definitions"
  ON daypart_definitions FOR UPDATE
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

CREATE POLICY "Admin users can delete daypart definitions"
  ON daypart_definitions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Insert default daypart definitions
INSERT INTO daypart_definitions (daypart_name, display_label, description, color, default_start_time, default_end_time, default_days, icon, sort_order)
VALUES
  ('breakfast', 'Breakfast', 'Morning meal service period', 'bg-amber-100 text-amber-800 border-amber-300', '06:00:00', '11:00:00', ARRAY[1,2,3,4,5,6,0], 'Sunrise', 10),
  ('lunch', 'Lunch', 'Midday meal service period', 'bg-green-100 text-green-800 border-green-300', '11:00:00', '15:00:00', ARRAY[1,2,3,4,5,6,0], 'Sun', 20),
  ('dinner', 'Dinner', 'Evening meal service period', 'bg-blue-100 text-blue-800 border-blue-300', '17:00:00', '22:00:00', ARRAY[1,2,3,4,5,6,0], 'Moon', 30),
  ('late_night', 'Late Night', 'Late night service period', 'bg-violet-100 text-violet-800 border-violet-300', '22:00:00', '02:00:00', ARRAY[5,6,0], 'Stars', 40),
  ('dark_hours', 'Dark Hours', 'Closed/off hours period', 'bg-slate-100 text-slate-800 border-slate-300', '02:00:00', '06:00:00', ARRAY[1,2,3,4,5,6,0], 'MoonStar', 50)
ON CONFLICT (daypart_name) DO NOTHING;