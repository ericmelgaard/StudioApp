/*
  # Seed Demo Themes

  1. Purpose
    - Add 12 demo themes for placement group configuration
    - Each theme has a unique icon and name representing different food/store concepts
    
  2. Themes Added
    - Grill (flame icon)
    - Pizza (pizza-slice icon)
    - Coffee (coffee icon)
    - Action (zap icon)
    - Cantina (taco icon)
    - Picco (utensils-crossed icon)
    - DIY (wrench icon)
    - Mezze (utensils icon)
    - Entrance (door-open icon)
    - Breakfast (sunrise icon)
    - Dessert (ice-cream icon)
    - Drinks (wine icon)

  3. Notes
    - All themes set to active status
    - Icons reference lucide-react icon names
    - Can be replaced with real themes later
    - Only inserts if themes table is empty or missing these specific themes
*/

-- Only insert if these specific themes don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Grill') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Grill', 'Perfect for grilled items and BBQ', 'flame', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Pizza') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Pizza', 'Italian pizza and pasta items', 'pizza', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Coffee') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Coffee', 'Coffee shop and beverages', 'coffee', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Action') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Action', 'High-energy promotional content', 'zap', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Cantina') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Cantina', 'Mexican and Latin American cuisine', 'taco', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Picco') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Picco', 'Fine Italian dining experience', 'utensils-crossed', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'DIY') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('DIY', 'Build-your-own options', 'wrench', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Mezze') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Mezze', 'Mediterranean sharing plates', 'utensils', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Entrance') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Entrance', 'Welcome and entrance signage', 'door-open', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Breakfast') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Breakfast', 'Morning menu items', 'sunrise', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Dessert') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Dessert', 'Sweet treats and desserts', 'ice-cream', 'active', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM themes WHERE name = 'Drinks') THEN
    INSERT INTO themes (name, description, icon, status, concept_id) VALUES
      ('Drinks', 'Beverage and bar menu', 'wine', 'active', NULL);
  END IF;
END $$;