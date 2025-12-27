/*
  # Add locale override to stores table

  1. Changes
    - Add `locale` column to stores table
      - `locale` (text, nullable) - Store-specific language override
      - When null, store inherits language from company
      - When set, overrides company language for this store
    
  2. Notes
    - Stores can override their company's default language
    - Locale should match one of the locales configured in company_languages for the parent company
    - Validation is handled at the application level
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'locale'
  ) THEN
    ALTER TABLE stores ADD COLUMN locale text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stores_locale ON stores(locale) WHERE locale IS NOT NULL;
