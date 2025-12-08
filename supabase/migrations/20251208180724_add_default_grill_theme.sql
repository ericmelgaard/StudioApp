/*
  # Add Default Grill Theme

  1. Changes
    - Insert a default "Grill" theme with active status
    - Link the Grill theme to Signage and Shelf Label display types:
      - 4K HD Display (digital signage)
      - 4.2" ESL (shelf labels)
      - 5.4" ESL (shelf labels)
    - Set theme content as active and ready for deployment

  2. Notes
    - This provides a pre-configured theme for testing routines
    - Content data is initially empty but theme is marked active
    - Users can create placement routines for this theme immediately
*/

-- Insert the Grill theme
INSERT INTO themes (name, description, status, metadata)
VALUES (
  'Grill',
  'Default theme for grill items - includes signage and shelf label content',
  'active',
  '{"category": "menu", "type": "promotional"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Link Grill theme to display types (Signage and Shelf Labels)
INSERT INTO theme_content (theme_id, display_type_id, content_data, status)
SELECT 
  t.id,
  dt.id,
  '{}'::jsonb,
  'active'
FROM themes t
CROSS JOIN display_types dt
WHERE t.name = 'Grill'
  AND dt.name IN ('4K HD Display', '4.2" ESL', '5.4" ESL')
ON CONFLICT (theme_id, display_type_id) DO NOTHING;
