/*
  # Add Default Boards to Themes Without Boards

  1. Purpose
    - Backfill existing themes that have no boards configured
    - Adds Digital Signage boards for Breakfast, Lunch, and Dinner dayparts
    - Ensures all themes have at least one board for content editing

  2. Changes
    - Inserts theme_boards records for themes with zero boards
    - Uses Digital Signage (4K HD Display) as the display type
    - Adds three boards per theme: Breakfast, Lunch, Dinner

  3. Notes
    - Only affects themes currently without boards
    - Does not modify themes that already have boards
    - New themes created via UI will require boards before saving
*/

-- Insert default boards for themes without any boards
INSERT INTO theme_boards (theme_id, display_type_id, daypart_id, layout_config, status)
SELECT 
  t.id,
  '771ebc47-63bc-4045-b2c8-f97741cab6ef'::uuid, -- 4K HD Display (Digital Signage)
  dp.id,
  '{"type": "full_display", "width": "100%", "height": "100%"}'::jsonb,
  'active'
FROM themes t
CROSS JOIN (
  SELECT id FROM daypart_definitions 
  WHERE daypart_name IN ('breakfast', 'lunch', 'dinner')
  AND is_active = true
  AND store_id IS NULL
  AND concept_id IS NULL
) dp
WHERE NOT EXISTS (
  SELECT 1 FROM theme_boards tb 
  WHERE tb.theme_id = t.id 
  AND tb.status = 'active'
);
