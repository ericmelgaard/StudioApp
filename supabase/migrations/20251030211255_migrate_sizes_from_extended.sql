/*
  # Migrate Size Options to Core Sizes Attribute
*/

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

UPDATE products
SET attributes = jsonb_set(
  COALESCE(attributes, '{}'::jsonb),
  '{sizes}',
  '[]'::jsonb
)
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'QSR')
  AND (attributes->>'sizes' IS NULL OR NOT jsonb_typeof(attributes->'sizes') = 'array');

UPDATE products
SET attributes = attributes - 'size_options'
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'QSR')
  AND attributes ? 'size_options';