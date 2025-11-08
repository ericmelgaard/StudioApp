/*
  # Update QSR Template Sizes to Options

  1. Changes
    - Update product_attribute_templates to change "Sizes" label to "Options" in QSR template
    - This updates the core_attributes schema for the QSR template
*/

-- Update the QSR template to change Sizes label to Options
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN attr->>'name' = 'sizes' 
        THEN jsonb_set(attr, '{label}', '"Options"')
        ELSE attr
      END
    )
    FROM jsonb_array_elements(attribute_schema->'core_attributes') AS attr
  )
)
WHERE name = 'QSR'
  AND attribute_schema->'core_attributes' IS NOT NULL;
