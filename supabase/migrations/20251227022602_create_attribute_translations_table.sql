/*
  # Create attribute_translations table for translating attribute labels

  1. New Tables
    - `attribute_translations`
      - `id` (uuid, primary key)
      - `attribute_id` (uuid, foreign key to available_attributes)
      - `locale` (text, e.g., 'fr-ca', 'es-mx')
      - `label` (text, translated label)
      - `description` (text, translated description)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `attribute_translations` table
    - Add policies for public read access
    - Add policies for authenticated users to manage translations

  3. Constraints
    - Unique constraint on attribute_id + locale
    - Check constraint to ensure locale is not empty

  4. Indexes
    - Index on attribute_id for performance
    - Index on locale for filtering

  5. Triggers
    - Auto-update updated_at timestamp on changes
*/

CREATE TABLE IF NOT EXISTS attribute_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES available_attributes(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale <> ''),
  label text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(attribute_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_attribute_translations_attribute_id ON attribute_translations(attribute_id);
CREATE INDEX IF NOT EXISTS idx_attribute_translations_locale ON attribute_translations(locale);

ALTER TABLE attribute_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to attribute translations"
  ON attribute_translations
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert attribute translations"
  ON attribute_translations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update attribute translations"
  ON attribute_translations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete attribute translations"
  ON attribute_translations
  FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION update_attribute_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attribute_translations_updated_at
  BEFORE UPDATE ON attribute_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_attribute_translations_updated_at();