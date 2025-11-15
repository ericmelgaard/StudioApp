/*
  # Migrate Existing Categories to Sections

  1. Changes
    - Map existing category values to appropriate sections
    - Update available_attributes records with section_id based on category
    - Categories mapped:
      - basic, pricing, inventory, operations, configuration → Core Attributes
      - nutrition, dietary, taste → Nutrition
      - media → Images
      - organization → Core Attributes

  2. Notes
    - This migration preserves the category field for backward compatibility
    - All attributes will be assigned to appropriate sections
    - Custom categories default to Core Attributes section
*/

-- Update attributes with section_id based on category
UPDATE available_attributes
SET section_id = (
  SELECT id FROM attribute_sections 
  WHERE name = 'core_attributes'
)
WHERE category IN ('basic', 'pricing', 'inventory', 'operations', 'configuration', 'organization')
  OR category IS NULL;

UPDATE available_attributes
SET section_id = (
  SELECT id FROM attribute_sections 
  WHERE name = 'nutrition'
)
WHERE category IN ('nutrition', 'dietary', 'taste');

UPDATE available_attributes
SET section_id = (
  SELECT id FROM attribute_sections 
  WHERE name = 'images'
)
WHERE category = 'media';

-- Set default section for any remaining unmapped attributes
UPDATE available_attributes
SET section_id = (
  SELECT id FROM attribute_sections 
  WHERE name = 'core_attributes'
)
WHERE section_id IS NULL;
