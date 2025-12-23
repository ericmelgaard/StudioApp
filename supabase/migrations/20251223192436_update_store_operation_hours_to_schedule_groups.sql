/*
  # Update Store Operation Hours to Use Schedule Groups

  1. Changes
    - Drop the old store_operation_hours table
    - Create new store_operation_hours_schedules table with schedule group pattern
    - Uses days_of_week array instead of individual day records
    - Supports multiple schedule groups per store (e.g., "Weekday Hours", "Weekend Hours")

  2. New Tables
    - `store_operation_hours_schedules`
      - `id` (uuid, primary key)
      - `store_id` (bigint, foreign key to stores)
      - `schedule_name` (text, optional name like "Weekday Hours")
      - `days_of_week` (integer array, days this schedule applies to)
      - `open_time` (time, opening time)
      - `close_time` (time, closing time)
      - `is_closed` (boolean, for closed days)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS with public access policies
*/

DROP TABLE IF EXISTS store_operation_hours CASCADE;

CREATE TABLE IF NOT EXISTS store_operation_hours_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id bigint NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  schedule_name text,
  days_of_week integer[] NOT NULL DEFAULT '{}',
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_operation_hours_schedules_store_id 
  ON store_operation_hours_schedules(store_id);

ALTER TABLE store_operation_hours_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to store operation schedules"
  ON store_operation_hours_schedules
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert of store operation schedules"
  ON store_operation_hours_schedules
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update of store operation schedules"
  ON store_operation_hours_schedules
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete of store operation schedules"
  ON store_operation_hours_schedules
  FOR DELETE
  USING (true);
