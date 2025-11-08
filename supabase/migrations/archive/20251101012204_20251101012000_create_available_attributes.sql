/*
  # Create Available Attributes Library

  1. New Table
    - `available_attributes`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Field name (e.g., "price", "calories")
      - `label` (text) - Display label
      - `type` (text) - Data type (text, number, richtext, etc.)
      - `default_required` (boolean) - Default required state
      - `description` (text, optional) - Field description
      - `category` (text) - Grouping category (e.g., "pricing", "nutrition")
      - `is_system` (boolean) - System-defined attribute
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Allow anonymous read access for demos
    - Restrict modifications to authenticated users

  3. Seed Data
    - Add common QSR/food service attributes
*/

-- Create the available_attributes table
CREATE TABLE IF NOT EXISTS available_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  default_required boolean DEFAULT false,
  description text,
  category text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE available_attributes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read
CREATE POLICY "Anyone can read available attributes"
  ON available_attributes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Authenticated users can manage available attributes"
  ON available_attributes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed common QSR/food service attributes
INSERT INTO available_attributes (name, label, type, default_required, description, category, is_system) VALUES
  ('name', 'Product Name', 'richtext', true, 'Name of the product', 'basic', true),
  ('description', 'Description', 'richtext', false, 'Product description', 'basic', true),
  ('price', 'Price', 'number', false, 'Base price', 'pricing', true),
  ('calories', 'Calories', 'number', false, 'Calorie count', 'nutrition', true),
  ('category', 'Category', 'text', false, 'Product category', 'organization', false),
  ('thumbnail', 'Thumbnail Image', 'image', false, 'Product thumbnail', 'media', true),
  ('sizes', 'Sizes', 'sizes', false, 'Product size variations', 'pricing', true),
  ('portion', 'Portion Size', 'text', false, 'Serving size description', 'nutrition', false),
  ('sku', 'SKU', 'text', false, 'Stock keeping unit', 'inventory', false),
  ('allergens', 'Allergens', 'text', false, 'Allergen information', 'nutrition', false),
  ('prep_time', 'Prep Time (minutes)', 'number', false, 'Preparation time in minutes', 'operations', false),
  ('has_modifiers', 'Has Modifiers', 'boolean', false, 'Can be customized', 'configuration', false),
  ('protein', 'Protein (g)', 'number', false, 'Protein in grams', 'nutrition', false),
  ('carbs', 'Carbohydrates (g)', 'number', false, 'Carbs in grams', 'nutrition', false),
  ('fat', 'Fat (g)', 'number', false, 'Fat in grams', 'nutrition', false),
  ('sodium', 'Sodium (mg)', 'number', false, 'Sodium in milligrams', 'nutrition', false),
  ('ingredients', 'Ingredients', 'text', false, 'Ingredient list', 'nutrition', false),
  ('vegan', 'Vegan', 'boolean', false, 'Suitable for vegans', 'dietary', false),
  ('vegetarian', 'Vegetarian', 'boolean', false, 'Suitable for vegetarians', 'dietary', false),
  ('gluten_free', 'Gluten Free', 'boolean', false, 'Gluten-free option', 'dietary', false),
  ('spicy_level', 'Spicy Level', 'number', false, 'Spice level (1-5)', 'taste', false)
ON CONFLICT (name) DO NOTHING;
