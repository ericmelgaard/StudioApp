/*
  # Add Translations Column to Product Attribute Templates

  1. Changes
    - Add `translations` JSONB column to `product_attribute_templates` table
    - This will store an array of translation configurations
    - Each translation config contains locale, locale_name, and field_labels

  2. Structure
    - translations: [
        {
          locale: "fr-FR",
          locale_name: "French",
          field_labels: {
            "field_name": "Translated Label"
          }
        }
      ]
*/

-- Add translations column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_attribute_templates'
    AND column_name = 'translations'
  ) THEN
    ALTER TABLE product_attribute_templates
    ADD COLUMN translations JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
