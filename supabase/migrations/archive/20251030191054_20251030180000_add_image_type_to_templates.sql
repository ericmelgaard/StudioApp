/*
  # Add Image Type to Attribute Templates

  1. Updates
    - Update attribute templates to support "image" type with resolution specifications
    - Migrate QSR template's image_url to thumbnail image type (200x300)
    - Add resolution field for image type attributes

  2. Changes to QSR Template
    - Replace `image_url` (text) with `thumbnail` (image, 200x300)
    - Supports future additions like `hero_image`, `gallery_images`, etc.

  3. Image Type Schema
    - type: "image"
    - resolution: { width: number, height: number }
    - label: display name
    - required: boolean
*/

-- Update QSR template to use image type for thumbnail
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

-- Migrate existing products: rename image_url to thumbnail for QSR products
UPDATE products
SET attributes = attributes - 'image_url' || jsonb_build_object('thumbnail', attributes->'image_url')
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'QSR')
  AND attributes ? 'image_url';

-- Update Webtrition template to use image type
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

-- Migrate existing products: rename image_url to thumbnail for Webtrition products
UPDATE products
SET attributes = attributes - 'image_url' || jsonb_build_object('thumbnail', attributes->'image_url')
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'Webtrition')
  AND attributes ? 'image_url';

-- Update Retail template to use image type
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

-- Migrate existing products: rename image_url to thumbnail for Retail products
UPDATE products
SET attributes = attributes - 'image_url' || jsonb_build_object('thumbnail', attributes->'image_url')
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'Retail')
  AND attributes ? 'image_url';
