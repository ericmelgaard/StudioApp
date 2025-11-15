/*
  # Add Default Option Attributes to Product Templates

  1. Updates
    - Adds `option_attributes` array to all existing product attribute templates
    - Includes default option fields: label, description, price, calories

  2. Notes
    - option_attributes define what fields are available when creating product options
    - Existing products are not modified, only the templates
*/

-- Update all product attribute templates to include default option attributes
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{option_attributes}',
  '[
    {"name": "label", "type": "text", "required": true, "label": "Label"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "price", "type": "number", "required": true, "label": "Price"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"}
  ]'::jsonb,
  true
)
WHERE attribute_schema->>'option_attributes' IS NULL;
