/*
  # Update QSR Template Image URL to Image Type
  
  1. Updates
    - Replace `image_url` (text type) with `thumbnail` (image type)
    - Add resolution specification (200x300) for the image field
    - Migrate existing product data from image_url to thumbnail
  
  2. Changes
    - QSR template core_attributes: image_url → thumbnail with type "image"
    - Resolution: 200px width × 300px height
    - All existing products with image_url will have data migrated to thumbnail
*/

-- Update QSR template to use image type for thumbnail
UPDATE product_attribute_templates
SET attribute_schema = jsonb_set(
  attribute_schema,
  '{core_attributes}',
  '[
    {"name": "name", "type": "text", "required": true, "label": "Product Name"},
    {"name": "description", "type": "text", "required": false, "label": "Description"},
    {"name": "price", "type": "number", "required": false, "label": "Price"},
    {"name": "calories", "type": "number", "required": false, "label": "Calories"},
    {"name": "category", "type": "text", "required": false, "label": "Category"},
    {"name": "thumbnail", "type": "image", "required": false, "label": "Thumbnail Image", "resolution": {"width": 200, "height": 300}},
    {"name": "sizes", "type": "sizes", "required": false, "label": "Sizes"}
  ]'::jsonb
)
WHERE name = 'QSR';

-- Migrate existing products: rename image_url to thumbnail for QSR products
UPDATE products
SET attributes = attributes - 'image_url' || jsonb_build_object('thumbnail', attributes->'image_url')
WHERE attribute_template_id = (SELECT id FROM product_attribute_templates WHERE name = 'QSR')
  AND attributes ? 'image_url';
