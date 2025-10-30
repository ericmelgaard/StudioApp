/*
  # Update QSR Template - Make Price Optional

  1. Changes
    - Update the QSR template to make price field optional instead of required
    - This allows products to use size-based pricing instead of a single price
  
  2. Notes
    - Products can now have either a base price OR use sizes with individual pricing
*/

UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN attr->>'name' = 'price' 
        THEN jsonb_set(attr, '{required}', 'false'::jsonb)
        ELSE attr
      END
    )
    FROM jsonb_array_elements(attribute_schema->'core_attributes') AS attr
  )
)
WHERE name = 'QSR';
