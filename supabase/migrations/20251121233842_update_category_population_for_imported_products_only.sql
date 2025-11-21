/*
  # Update Category Population Logic for Imported Products Only

  1. Purpose
    - Replace the previous migration logic to only create categories for products that have been imported
    - Categories are created only when a product references an integration_product with category data
    - This ensures we don't create empty categories from the integration catalog

  2. New Policy (Forward-Looking)
    - When a new product is imported and linked to integration_products:
      - Check if the integration product has category data (data.category or path_id)
      - Check if a category already exists for that integration source + category name
      - If not, create the category
      - Assign the product to the category

  3. Implementation
    - Drop and recreate the population logic as a reusable function
    - This function can be called during product imports to ensure categories are created as needed
*/

-- Create a function to ensure category exists and assign it to a product
CREATE OR REPLACE FUNCTION ensure_product_category(
  p_product_id uuid,
  p_integration_product_id uuid
) RETURNS void AS $$
DECLARE
  v_category_name text;
  v_source_id uuid;
  v_category_id uuid;
  v_integration_data jsonb;
  v_path_id text;
BEGIN
  -- Get integration product data
  SELECT data, path_id, wand_source_id
  INTO v_integration_data, v_path_id, v_source_id
  FROM integration_products
  WHERE id = p_integration_product_id;

  -- Skip if no integration product found
  IF v_integration_data IS NULL THEN
    RETURN;
  END IF;

  -- Determine category name (prefer data.category, fallback to path_id)
  v_category_name := COALESCE(
    NULLIF(v_integration_data->>'category', ''),
    NULLIF(v_path_id, '')
  );

  -- Skip if no valid category name
  IF v_category_name IS NULL OR v_category_name = '' THEN
    RETURN;
  END IF;

  -- Check if category already exists for this integration source and category name
  SELECT id INTO v_category_id
  FROM product_categories
  WHERE integration_source_id = v_source_id
    AND integration_category_id = v_category_name
  LIMIT 1;

  -- Create category if it doesn't exist
  IF v_category_id IS NULL THEN
    INSERT INTO product_categories (
      name,
      integration_source_id,
      integration_category_id,
      sort_order
    )
    VALUES (
      v_category_name,
      v_source_id,
      v_category_name,
      0
    )
    RETURNING id INTO v_category_id;
  END IF;

  -- Assign product to category (ignore if already assigned)
  INSERT INTO product_category_assignments (product_id, category_id)
  VALUES (p_product_id, v_category_id)
  ON CONFLICT (product_id, category_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically assign categories when products are created/updated
CREATE OR REPLACE FUNCTION auto_assign_product_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.integration_product_id IS NOT NULL THEN
    PERFORM ensure_product_category(NEW.id, NEW.integration_product_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_auto_assign_category ON products;

CREATE TRIGGER trigger_auto_assign_category
  AFTER INSERT OR UPDATE OF integration_product_id ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_product_category();

-- Backfill: Process existing products that have integration_product_id
DO $$
DECLARE
  product_record RECORD;
BEGIN
  FOR product_record IN
    SELECT id, integration_product_id
    FROM products
    WHERE integration_product_id IS NOT NULL
  LOOP
    PERFORM ensure_product_category(product_record.id, product_record.integration_product_id);
  END LOOP;
END $$;
