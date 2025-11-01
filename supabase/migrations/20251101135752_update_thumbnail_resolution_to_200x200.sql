/*
  # Update thumbnail resolution to 200x200

  1. Changes
    - Update all product attribute templates to change thumbnail resolution from 200x300 to 200x200
    - Affects QSR, Webtrition, and Retail templates
  
  2. Notes
    - This only updates the template definition, not existing image data
    - New images uploaded will use the 200x200 resolution constraint
*/

-- Update QSR template thumbnail resolution
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'name' = 'thumbnail' THEN
          jsonb_set(elem, '{resolution}', '{"width": 200, "height": 200}'::jsonb)
        ELSE elem
      END
    )
    FROM jsonb_array_elements(attribute_schema->'core_attributes') elem
  )
)
WHERE name = 'QSR';

-- Update Webtrition template thumbnail resolution
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'name' = 'thumbnail' THEN
          jsonb_set(elem, '{resolution}', '{"width": 200, "height": 200}'::jsonb)
        ELSE elem
      END
    )
    FROM jsonb_array_elements(attribute_schema->'core_attributes') elem
  )
)
WHERE name = 'Webtrition';

-- Update Retail template thumbnail resolution
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'name' = 'thumbnail' THEN
          jsonb_set(elem, '{resolution}', '{"width": 200, "height": 200}'::jsonb)
        ELSE elem
      END
    )
    FROM jsonb_array_elements(attribute_schema->'core_attributes') elem
  )
)
WHERE name = 'Retail';
