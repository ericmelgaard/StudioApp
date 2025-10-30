/*
  # Add Rich Text Type to Attribute Templates

  1. Updates
    - Update attribute templates to support "richtext" type
    - Convert QSR template's name field to richtext type
    - Richtext fields support HTML formatting

  2. Changes to QSR Template
    - Change `name` from "text" to "richtext" type
    - Supports bold, italic, colors, lists, etc.

  3. Rich Text Type Schema
    - type: "richtext"
    - minHeight: optional minimum editor height (default: 120px)
    - label: display name
    - required: boolean
*/

-- Update QSR template to use richtext type for name
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "richtext", "required": true, "label": "Product Name", "minHeight": "100px"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "price", "type": "number", "required": true, "label": "Price"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"},
    {"name": "category", "type": "text", "required": false, "label": "Category"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'QSR';

-- Update Webtrition template to use richtext type for name
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "richtext", "required": true, "label": "Product Name", "minHeight": "100px"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "portion", "type": "text", "required": false, "label": "Portion Size"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'Webtrition';

-- Update Retail template to use richtext type for name
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "richtext", "required": true, "label": "Product Name", "minHeight": "100px"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "price", "type": "number", "required": true, "label": "Price"},
    {"name": "sku", "type": "text", "required": false, "label": "SKU"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'Retail';
