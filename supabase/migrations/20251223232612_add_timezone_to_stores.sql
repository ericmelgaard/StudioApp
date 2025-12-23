/*
  # Add timezone field to stores table

  1. Changes
    - Add `timezone` column to `stores` table
    - Default to 'America/New_York' (EST/EDT)
    - Uses IANA timezone names for proper DST handling

  2. Notes
    - IANA timezone names (e.g., 'America/New_York') automatically handle daylight saving time
    - This is the standard format used by most programming languages and databases
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE stores ADD COLUMN timezone text DEFAULT 'America/New_York';
  END IF;
END $$;
