/*
  # Add Image Type to Attribute Templates
*/

UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "text", "required": true, "label": "Product Name"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "price", "type": "number", "required": true, "label": "Price"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"},
    {"name": "category", "type": "text", "required": false, "label": "Category"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'QSR';

UPDATE products
SET attributes = attributes - 'image_url' || jsonb_build_object('thumbnail', attributes->'image_url')
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'QSR')
  AND attributes ? 'image_url';

UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "text", "required": true, "label": "Product Name"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "portion", "type": "text", "required": false, "label": "Portion Size"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'Webtrition';

UPDATE products
SET attributes = attributes - 'image_url' || jsonb_build_object('thumbnail', attributes->'image_url')
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'Webtrition')
  AND attributes ? 'image_url';

UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "text", "required": true, "label": "Product Name"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "price", "type": "number", "required": true, "label": "Price"},
    {"name": "sku", "type": "text", "required": false, "label": "SKU"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}}
  ]'::jsonb
)
WHERE name = 'Retail';

UPDATE products
SET attributes = attributes - 'image_url' || jsonb_build_object('thumbnail', attributes->'image_url')
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'Retail')
  AND attributes ? 'image_url';