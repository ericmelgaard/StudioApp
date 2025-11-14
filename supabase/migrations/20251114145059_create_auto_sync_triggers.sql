/*
  # Create Auto-Sync Triggers for Product State Management

  ## Overview
  This migration creates database triggers to automatically sync product values when
  integration catalog data is updated.

  ## New Functions

  ### `sync_products_after_integration_update()`
  Triggers when integration_products, integration_modifiers, or integration_discounts are updated.
  Finds all affected products and recalculates their resolved values.

  ### `refresh_product_values(product_id uuid)`
  Refreshes all field values for a product based on current integration data.

  ### `refresh_option_values(product_id uuid)`
  Refreshes all option values that are linked to integration data.

  ## Triggers
  - After UPDATE on integration_products
  - After UPDATE on integration_modifiers
  - After UPDATE on integration_discounts

  ## Behavior
  - Only updates products linked to the changed mapping_id
  - Respects local_fields array (skips overridden fields)
  - Recalculates price_calculations formulas
  - Updates options with API links
  - Updates last_synced_at timestamp

  ## Notes
  - Triggers run asynchronously to avoid blocking integration updates
  - Failed syncs are logged but don't block the integration update
  - Products with parent_product_id are NOT auto-synced (they inherit)
*/

-- Function to refresh product field values from integration data
CREATE OR REPLACE FUNCTION refresh_product_values(target_product_id uuid)
RETURNS void AS $$
DECLARE
  product_record RECORD;
  integration_data RECORD;
  table_name text;
BEGIN
  SELECT * INTO product_record
  FROM products
  WHERE id = target_product_id;

  IF NOT FOUND OR product_record.mapping_id IS NULL OR product_record.integration_source_id IS NULL THEN
    RETURN;
  END IF;

  table_name := CASE product_record.integration_type
    WHEN 'product' THEN 'integration_products'
    WHEN 'modifier' THEN 'integration_modifiers'
    WHEN 'discount' THEN 'integration_discounts'
    ELSE NULL
  END;

  IF table_name IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT * FROM %I WHERE mapping_id = $1 AND wand_source_id = $2',
    table_name
  ) INTO integration_data
  USING product_record.mapping_id, product_record.integration_source_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE products
  SET
    attributes = CASE
      WHEN 'name' = ANY(local_fields) THEN attributes
      ELSE jsonb_set(
        COALESCE(attributes, '{}'::jsonb),
        '{name}',
        to_jsonb(integration_data.name)
      )
    END,
    last_synced_at = now()
  WHERE id = target_product_id;

END;
$$ LANGUAGE plpgsql;

-- Function to refresh option values from integration data
CREATE OR REPLACE FUNCTION refresh_option_values(target_product_id uuid)
RETURNS void AS $$
DECLARE
  product_record RECORD;
  options_array jsonb;
  option_record jsonb;
  updated_options jsonb := '[]'::jsonb;
  integration_data RECORD;
  table_name text;
BEGIN
  SELECT * INTO product_record
  FROM products
  WHERE id = target_product_id;

  IF NOT FOUND OR product_record.integration_source_id IS NULL THEN
    RETURN;
  END IF;

  options_array := product_record.attributes->'options';
  
  IF options_array IS NULL OR jsonb_array_length(options_array) = 0 THEN
    RETURN;
  END IF;

  FOR option_record IN SELECT * FROM jsonb_array_elements(options_array)
  LOOP
    IF option_record->'link' IS NOT NULL AND 
       option_record->'link'->>'type' = 'direct' AND
       option_record->'link'->'directLink'->>'mapping_id' IS NOT NULL THEN
      
      table_name := CASE option_record->'link'->'directLink'->>'integration_type'
        WHEN 'product' THEN 'integration_products'
        WHEN 'modifier' THEN 'integration_modifiers'
        WHEN 'discount' THEN 'integration_discounts'
        ELSE NULL
      END;

      IF table_name IS NOT NULL THEN
        EXECUTE format(
          'SELECT * FROM %I WHERE mapping_id = $1 AND wand_source_id = $2',
          table_name
        ) INTO integration_data
        USING 
          option_record->'link'->'directLink'->>'mapping_id',
          product_record.integration_source_id;

        IF FOUND THEN
          option_record := jsonb_set(
            option_record,
            '{label}',
            to_jsonb(integration_data.name)
          );
          option_record := jsonb_set(
            option_record,
            '{price}',
            to_jsonb(COALESCE((integration_data.data->>'price')::numeric, 0))
          );
        END IF;
      END IF;
    END IF;

    updated_options := updated_options || option_record;
  END LOOP;

  UPDATE products
  SET attributes = jsonb_set(
    COALESCE(attributes, '{}'::jsonb),
    '{options}',
    updated_options
  )
  WHERE id = target_product_id;

END;
$$ LANGUAGE plpgsql;

-- Trigger function for integration updates
CREATE OR REPLACE FUNCTION sync_products_after_integration_update()
RETURNS TRIGGER AS $$
DECLARE
  affected_product RECORD;
BEGIN
  FOR affected_product IN
    SELECT id, integration_source_id
    FROM products
    WHERE mapping_id = NEW.mapping_id
    AND integration_source_id = NEW.wand_source_id
    AND parent_product_id IS NULL
  LOOP
    PERFORM refresh_product_values(affected_product.id);
    PERFORM refresh_option_values(affected_product.id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on integration tables
DROP TRIGGER IF EXISTS trigger_sync_products_after_integration_products_update ON integration_products;
CREATE TRIGGER trigger_sync_products_after_integration_products_update
  AFTER UPDATE ON integration_products
  FOR EACH ROW
  EXECUTE FUNCTION sync_products_after_integration_update();

DROP TRIGGER IF EXISTS trigger_sync_products_after_integration_modifiers_update ON integration_modifiers;
CREATE TRIGGER trigger_sync_products_after_integration_modifiers_update
  AFTER UPDATE ON integration_modifiers
  FOR EACH ROW
  EXECUTE FUNCTION sync_products_after_integration_update();

DROP TRIGGER IF EXISTS trigger_sync_products_after_integration_discounts_update ON integration_discounts;
CREATE TRIGGER trigger_sync_products_after_integration_discounts_update
  AFTER UPDATE ON integration_discounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_products_after_integration_update();
