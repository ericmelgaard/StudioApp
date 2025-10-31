/*
  # Add translations support to product attribute templates

  1. Changes
    - Add `translations` jsonb column to `product_attribute_templates` table
    - Translations store locale-specific field label configurations

  2. Structure
    - translations: Array of translation configs
    - Each config has: locale, locale_name, field_labels (mapping field names to translated labels)
*/

ALTER TABLE product_attribute_templates
ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '[]'::jsonb;
