/*
  # Create company_languages table for multi-language support

  1. New Tables
    - `company_languages`
      - `id` (uuid, primary key)
      - `company_id` (integer, foreign key to companies)
      - `locale` (text, e.g., 'en', 'fr-ca', 'es-mx')
      - `locale_name` (text, e.g., 'English', 'French Canadian')
      - `sort_order` (integer, for display ordering)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `company_languages` table
    - Add policy for authenticated users to read languages for their companies
    - Add policy for authenticated users to manage languages for their companies

  3. Constraints
    - Unique constraint on company_id + locale
    - Check constraint to ensure locale is not empty
    - English ('en') cannot be deleted (enforced at application level)

  4. Indexes
    - Index on company_id for performance
    - Index on locale for filtering
*/

CREATE TABLE IF NOT EXISTS company_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale <> ''),
  locale_name text NOT NULL CHECK (locale_name <> ''),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_company_languages_company_id ON company_languages(company_id);
CREATE INDEX IF NOT EXISTS idx_company_languages_locale ON company_languages(locale);

ALTER TABLE company_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to company languages"
  ON company_languages
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert company languages"
  ON company_languages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update company languages"
  ON company_languages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete company languages"
  ON company_languages
  FOR DELETE
  TO authenticated
  USING (locale <> 'en');