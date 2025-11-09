/*
  # Seed Default Brands for WAND Development

  1. Purpose
    - Add default brand options to WAND Development concept
    - Enable immediate testing of brand inheritance system
    - Include common brands used in testing

  2. Changes
    - Update WAND Development concept with default brand options
    - Set brands: Auntie Anne's, Cinnabon, Carvel, Jamba, Moe's, Schlotzsky's

  Note: This is a one-time seed for testing. Brands can be modified through the UI.
*/

-- Add default brand options to WAND Development concept
UPDATE concepts
SET brand_options = '["Auntie Anne''s", "Cinnabon", "Carvel", "Jamba", "Moe''s Southwest Grill", "Schlotzsky''s"]'::jsonb
WHERE name = 'WAND Development';

-- Verify the update
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM concepts
  WHERE name = 'WAND Development' 
  AND jsonb_array_length(brand_options) > 0;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'Successfully added % brands to WAND Development concept', 
      (SELECT jsonb_array_length(brand_options) FROM concepts WHERE name = 'WAND Development');
  ELSE
    RAISE WARNING 'WAND Development concept not found or brands not set';
  END IF;
END $$;
