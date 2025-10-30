/*
  # Migrate Size Options to Core Sizes Attribute

  1. Updates
    - Remove "size_options" from extended attributes in QSR template
    - Initialize empty "sizes" array in all QSR products that don't have it
    - Migrate existing size_options data to sizes format if present

  2. Changes
    - Clean up old size_options from extended attributes
    - Ensure all products have sizes attribute initialized
*/

-- Remove size_options from QSR template extended attributes
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{extended_attributes}',
  (
    SELECT jsonb_agg(attr)
    FROM jsonb_array_elements(attribute_schema->'extended_attributes') AS attr
    WHERE attr->>'name' != 'size_options'
  )
)
WHERE name = 'QSR';

-- Initialize sizes attribute for all QSR products that don't have it
UPDATE products
SET attributes = jsonb_set(
  COALESCE(attributes, '{}'::jsonb),
  '{sizes}',
  '[]'::jsonb
)
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'QSR')
  AND (attributes->>'sizes' IS NULL OR NOT jsonb_typeof(attributes->'sizes') = 'array');

-- Remove old size_options from product attributes
UPDATE products
SET attributes = attributes - 'size_options'
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'QSR')
  AND attributes ? 'size_options';
