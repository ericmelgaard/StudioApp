/*
  # Create Attribute Sections System

  1. New Tables
    - `attribute_sections`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Internal identifier
      - `label` (text) - Display label
      - `description` (text) - Section description
      - `icon` (text) - Icon identifier
      - `display_order` (integer) - Sort order
      - `is_system` (boolean) - System-defined section
      - `section_type` (text) - Type: core, extended, images, options, nutrition, custom
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `section_id` to `available_attributes` table (nullable for migration)
    - Keep existing `category` field for backward compatibility

  3. Data
    - Insert default sections: Core Attributes, Extended Attributes, Images, Options, Nutrition

  4. Security
    - Enable RLS on `attribute_sections` table
    - Add policies for authenticated and unauthenticated users
*/

CREATE TABLE IF NOT EXISTS attribute_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_system boolean DEFAULT false,
  section_type text NOT NULL CHECK (section_type IN ('core', 'extended', 'images', 'options', 'nutrition', 'custom')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'available_attributes') THEN
    ALTER TABLE available_attributes ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES attribute_sections(id) ON DELETE SET NULL;
  END IF;
END $$;

INSERT INTO attribute_sections (name, label, description, icon, display_order, is_system, section_type)
VALUES
  ('core_attributes', 'Core Attributes', 'Essential product information used across all product types', 'layers', 1, true, 'core'),
  ('extended_attributes', 'Extended Attributes', 'Custom attributes specific to this template', 'sliders', 2, true, 'extended'),
  ('images', 'Images', 'Product images and visual assets', 'image', 3, true, 'images'),
  ('options', 'Options', 'Product variations and modifiers', 'list', 4, true, 'options'),
  ('nutrition', 'Nutrition', 'Nutritional information and dietary data', 'activity', 5, true, 'nutrition')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE attribute_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attribute sections"
  ON attribute_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Unauthenticated users can view attribute sections"
  ON attribute_sections FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create custom sections"
  ON attribute_sections FOR INSERT
  TO authenticated
  WITH CHECK (is_system = false);

CREATE POLICY "Users can update custom sections"
  ON attribute_sections FOR UPDATE
  TO authenticated
  USING (is_system = false)
  WITH CHECK (is_system = false);

CREATE POLICY "Users can delete custom sections"
  ON attribute_sections FOR DELETE
  TO authenticated
  USING (is_system = false);

CREATE INDEX IF NOT EXISTS idx_attribute_sections_type ON attribute_sections(section_type);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'available_attributes') THEN
    CREATE INDEX IF NOT EXISTS idx_available_attributes_section_id ON available_attributes(section_id);
  END IF;
END $$;