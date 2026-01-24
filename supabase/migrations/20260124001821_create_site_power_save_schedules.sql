/*
  # Create Site-Level Power Save Schedules

  1. New Tables
    - `site_power_save_schedules`
      - Site/concept-level Power Save schedules that stores inherit from
      - Similar structure to `daypart_definitions` for consistency
      - Includes schedule groups (regular and event-based)
  
  2. Changes
    - Make `store_id` nullable in `store_operation_hours_schedules` to support global defaults
    - Add `concept_id` to both tables for proper scoping
    
  3. Functions
    - `get_effective_power_save_schedules(p_store_id, p_concept_id)` - Returns effective schedules with inheritance
  
  4. Security
    - Enable RLS on `site_power_save_schedules`
    - Add policies for public access (matching daypart pattern)
*/

-- Create site-level Power Save schedules table
CREATE TABLE IF NOT EXISTS site_power_save_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  schedule_name text,
  days_of_week integer[] NOT NULL DEFAULT '{}',
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  schedule_type text DEFAULT 'regular',
  event_name text,
  event_date date,
  recurrence_type text,
  recurrence_config jsonb,
  priority_level integer DEFAULT 10,
  runs_on_days boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add concept_id to store_operation_hours_schedules if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_operation_hours_schedules' 
    AND column_name = 'concept_id'
  ) THEN
    ALTER TABLE store_operation_hours_schedules 
    ADD COLUMN concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make store_id nullable to allow site-level defaults
ALTER TABLE store_operation_hours_schedules 
ALTER COLUMN store_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE site_power_save_schedules ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching daypart pattern)
CREATE POLICY "Allow public read access to site power save schedules"
  ON site_power_save_schedules FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to site power save schedules"
  ON site_power_save_schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to site power save schedules"
  ON site_power_save_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to site power save schedules"
  ON site_power_save_schedules FOR DELETE
  USING (true);

-- Update store-level policies to allow null store_id
DROP POLICY IF EXISTS "Allow public read access to store operation hours schedules" ON store_operation_hours_schedules;
DROP POLICY IF EXISTS "Allow public insert access to store operation hours schedules" ON store_operation_hours_schedules;
DROP POLICY IF EXISTS "Allow public update access to store operation hours schedules" ON store_operation_hours_schedules;
DROP POLICY IF EXISTS "Allow public delete access to store operation hours schedules" ON store_operation_hours_schedules;

CREATE POLICY "Allow public read access to store operation hours schedules"
  ON store_operation_hours_schedules FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to store operation hours schedules"
  ON store_operation_hours_schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to store operation hours schedules"
  ON store_operation_hours_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to store operation hours schedules"
  ON store_operation_hours_schedules FOR DELETE
  USING (true);

-- Create function to get effective Power Save schedules (matches daypart pattern)
CREATE OR REPLACE FUNCTION get_effective_power_save_schedules(
  p_store_id bigint DEFAULT NULL,
  p_concept_id bigint DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  schedule_name text,
  days_of_week integer[],
  open_time time,
  close_time time,
  is_closed boolean,
  schedule_type text,
  event_name text,
  event_date date,
  recurrence_type text,
  recurrence_config jsonb,
  priority_level integer,
  runs_on_days boolean,
  source text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- If store_id provided, check for store-level schedules first
  IF p_store_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.schedule_name,
      s.days_of_week,
      s.open_time,
      s.close_time,
      s.is_closed,
      s.schedule_type,
      s.event_name,
      s.event_date,
      s.recurrence_type,
      s.recurrence_config,
      s.priority_level,
      s.runs_on_days,
      'store'::text as source,
      s.created_at,
      s.updated_at
    FROM store_operation_hours_schedules s
    WHERE s.store_id = p_store_id
      AND (p_concept_id IS NULL OR s.concept_id = p_concept_id OR s.concept_id IS NULL);
    
    -- If store has schedules, return them
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Otherwise, return site-level schedules
  RETURN QUERY
  SELECT 
    s.id,
    s.schedule_name,
    s.days_of_week,
    s.open_time,
    s.close_time,
    s.is_closed,
    s.schedule_type,
    s.event_name,
    s.event_date,
    s.recurrence_type,
    s.recurrence_config,
    s.priority_level,
    s.runs_on_days,
    'site'::text as source,
    s.created_at,
    s.updated_at
  FROM site_power_save_schedules s
  WHERE (p_concept_id IS NULL OR s.concept_id = p_concept_id OR s.concept_id IS NULL);
END;
$$ LANGUAGE plpgsql;
