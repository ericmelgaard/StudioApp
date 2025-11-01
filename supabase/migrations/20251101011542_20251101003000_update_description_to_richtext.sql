/*
  # Update Description Field to Rich Text

  1. Updates
    - Convert `description` field from "text" to "richtext" type in all attribute templates
    - Allows rich formatting (bold, italic, colors, lists) for product descriptions
    - Maintains existing data structure while upgrading field capabilities

  2. Changes to Templates
    - QSR Template: description → richtext
    - Webtrition Template: description → richtext
    - Retail Template: description → richtext

  3. Rich Text Configuration
    - type: "richtext"
    - minHeight: 150px (larger editor for descriptions)
    - Supports full HTML formatting via Quill editor
*/

-- Update QSR template to use richtext for description
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "richtext", "required": true, "label": "Product Name", "minHeight": "100px"},
    {"name": "description", "type": "richtext", "required": false, "label": "Description", "minHeight": "150px"},
    {"name": "price", "type": "number", "required": false, "label": "Price"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"},
    {"name": "category", "type": "text", "required": false, "label": "Category"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'QSR';

-- Update Webtrition template to use richtext for description
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "richtext", "required": true, "label": "Product Name", "minHeight": "100px"},
    {"name": "description", "type": "richtext", "required": false, "label": "Description", "minHeight": "150px"},
    {"name": "portion", "type": "text", "required": false, "label": "Portion Size"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'Webtrition';

-- Update Retail template to use richtext for description
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "richtext", "required": true, "label": "Product Name", "minHeight": "100px"},
    {"name": "description", "type": "richtext", "required": false, "label": "Description", "minHeight": "150px"},
    {"name": "price", "type": "number", "required": true, "label": "Price"},
    {"name": "sku", "type": "text", "required": false, "label": "SKU"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'Retail';
