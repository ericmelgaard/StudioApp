-- Add unique constraints for integration tables to support ON CONFLICT upserts

-- Integration products: unique per source config and external ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_products_unique 
  ON integration_products(source_config_id, external_id);

-- Integration modifiers: unique per source config and external ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_modifiers_unique 
  ON integration_modifiers(source_config_id, external_id);

-- Integration discounts: unique per source config and external ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_discounts_unique 
  ON integration_discounts(source_config_id, external_id);

-- Also add path_id based uniqueness as backup (in case external_id is not always present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_products_path_unique 
  ON integration_products(source_config_id, path_id) 
  WHERE path_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_modifiers_path_unique 
  ON integration_modifiers(source_config_id, path_id) 
  WHERE path_id IS NOT NULL;
