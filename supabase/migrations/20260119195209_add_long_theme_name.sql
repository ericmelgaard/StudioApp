/*
  # Add Long Theme Name for Testing

  1. Purpose
    - Add a theme with a longer name to test UI handling
    - Tests multi-line name display and layout constraints

  2. Theme Added
    - Grill + Action + Burgers (flame icon)
    - Demonstrates how UI handles longer theme names

  3. Notes
    - Set to active status
    - Available to all concepts (concept_id is NULL)
    - Uses flame icon to represent the grill concept
    - Only inserts if this specific theme doesn't exist
*/

-- Only insert if this theme doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Grill + Action + Burgers') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Grill + Action + Burgers', 'Combined grill, action promotions, and burger specials theme', 'flame', 'active', NULL);
  END IF;
END $$;