/*
  # Add Location Hierarchy Columns to Integration Tables

  1. Updates to integration_products
    - Add `source_config_id` (uuid, FK to integration_source_configs)
    - Add `concept_id` (integer, FK to concepts)
    - Add `company_id` (integer, FK to companies)
    - Add `site_id` (integer, FK to stores)

  2. Updates to integration_modifiers
    - Add `source_config_id` (uuid, FK to integration_source_configs)
    - Add `concept_id` (integer, FK to concepts)
    - Add `company_id` (integer, FK to companies)
    - Add `site_id` (integer, FK to stores)

  3. Updates to integration_discounts
    - Add `source_config_id` (uuid, FK to integration_source_configs)
    - Add `concept_id` (integer, FK to concepts)
    - Add `company_id` (integer, FK to companies)
    - Add `site_id` (integer, FK to stores)

  These columns track which level of the hierarchy each integration item belongs to,
  enabling proper filtering and inheritance in the system.
*/

-- Add columns to integration_products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_products' AND column_name = 'source_config_id'
  ) THEN
    ALTER TABLE integration_products
      ADD COLUMN source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE CASCADE,
      ADD COLUMN concept_id integer REFERENCES concepts(id) ON DELETE CASCADE,
      ADD COLUMN company_id integer REFERENCES companies(id) ON DELETE CASCADE,
      ADD COLUMN site_id integer REFERENCES stores(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_integration_products_config_id ON integration_products(source_config_id);
    CREATE INDEX IF NOT EXISTS idx_integration_products_concept_id ON integration_products(concept_id);
    CREATE INDEX IF NOT EXISTS idx_integration_products_company_id ON integration_products(company_id);
    CREATE INDEX IF NOT EXISTS idx_integration_products_site_id ON integration_products(site_id);
  END IF;
END $$;

-- Add columns to integration_modifiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_modifiers' AND column_name = 'source_config_id'
  ) THEN
    ALTER TABLE integration_modifiers
      ADD COLUMN source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE CASCADE,
      ADD COLUMN concept_id integer REFERENCES concepts(id) ON DELETE CASCADE,
      ADD COLUMN company_id integer REFERENCES companies(id) ON DELETE CASCADE,
      ADD COLUMN site_id integer REFERENCES stores(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_integration_modifiers_config_id ON integration_modifiers(source_config_id);
    CREATE INDEX IF NOT EXISTS idx_integration_modifiers_concept_id ON integration_modifiers(concept_id);
    CREATE INDEX IF NOT EXISTS idx_integration_modifiers_company_id ON integration_modifiers(company_id);
    CREATE INDEX IF NOT EXISTS idx_integration_modifiers_site_id ON integration_modifiers(site_id);
  END IF;
END $$;

-- Add columns to integration_discounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_discounts' AND column_name = 'source_config_id'
  ) THEN
    ALTER TABLE integration_discounts
      ADD COLUMN source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE CASCADE,
      ADD COLUMN concept_id integer REFERENCES concepts(id) ON DELETE CASCADE,
      ADD COLUMN company_id integer REFERENCES companies(id) ON DELETE CASCADE,
      ADD COLUMN site_id integer REFERENCES stores(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_integration_discounts_config_id ON integration_discounts(source_config_id);
    CREATE INDEX IF NOT EXISTS idx_integration_discounts_concept_id ON integration_discounts(concept_id);
    CREATE INDEX IF NOT EXISTS idx_integration_discounts_company_id ON integration_discounts(company_id);
    CREATE INDEX IF NOT EXISTS idx_integration_discounts_site_id ON integration_discounts(site_id);
  END IF;
END $$;