/*
  # Seed English language for all existing companies

  1. Changes
    - Insert English (locale: 'en', locale_name: 'English') for all existing companies
    - Set sort_order to 0 (English should always be first)
    - Use ON CONFLICT to avoid errors if English already exists for a company

  2. Notes
    - English is the default language for the platform
    - English cannot be removed from companies (enforced at application level)
    - All future companies should have English added automatically
*/

INSERT INTO company_languages (company_id, locale, locale_name, sort_order)
SELECT 
  id,
  'en',
  'English',
  0
FROM companies
ON CONFLICT (company_id, locale) DO NOTHING;