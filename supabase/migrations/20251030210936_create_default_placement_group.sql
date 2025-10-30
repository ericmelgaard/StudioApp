/*
  # Create Default Placement Group

  1. Changes
    - Inserts default store placement group "36355 - WAND Digital Demo"
    - Only creates if it doesn't already exist
  
  2. Notes
    - This is the root-level store placement group
    - All other placement groups should be children of this default group
*/

-- Insert default placement group if it doesn't exist
INSERT INTO placement_groups (name, description, parent_id, daypart_hours, meal_stations, templates, nfc_url)
SELECT 
  '36355 - WAND Digital Demo',
  'Default store placement group',
  NULL,
  '{}'::jsonb,
  ARRAY[]::text[],
  '{}'::jsonb,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM placement_groups WHERE name = '36355 - WAND Digital Demo'
);