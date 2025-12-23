/*
  # Create Store Operation Hours System

  1. New Tables
    - `store_operation_hours`
      - `id` (uuid, primary key)
      - `store_id` (bigint, foreign key to stores)
      - `day_of_week` (integer, 0-6 where 0 is Sunday)
      - `open_time` (time)
      - `close_time` (time)
      - `is_closed` (boolean, for days the store is closed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `store_operation_hours` table
    - Add policies for public read access (since stores are public)
    - No auth required for viewing store hours

  3. Indexes
    - Index on store_id for faster lookups
    - Unique constraint on store_id + day_of_week to prevent duplicate entries
*/

CREATE TABLE IF NOT EXISTS store_operation_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id bigint NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_store_day UNIQUE (store_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_store_operation_hours_store_id ON store_operation_hours(store_id);

ALTER TABLE store_operation_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to store hours"
  ON store_operation_hours
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert of store hours"
  ON store_operation_hours
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update of store hours"
  ON store_operation_hours
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete of store hours"
  ON store_operation_hours
  FOR DELETE
  USING (true);
