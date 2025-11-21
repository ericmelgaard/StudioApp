/*
  # Populate Categories from Integration Data

  1. Purpose
    - Extract unique categories from integration_products.data field
    - Create product_categories records for each unique category
    - Link categories to their integration source
    - Create product_category_assignments for products linked to integration data

  2. Process
    - Scan all integration_products for category data
    - Extract category from data.category or data.path field
    - Create unique categories with integration tracking
    - Assign categories to products that reference integration_products

  3. Notes
    - Categories are created only if they don't already exist
    - Integration source and category IDs are tracked for sync purposes
    - Products without categories are skipped (no error)
*/

DO $$
DECLARE
  integration_record RECORD;
  category_name text;
  v_category_id uuid;
  source_id uuid;
  existing_category_id uuid;
BEGIN
  -- Loop through all integration products that have category data
  FOR integration_record IN
    SELECT 
      id,
      wand_source_id,
      data->>'category' as category,
      path_id,
      external_id
    FROM integration_products
    WHERE (data->>'category' IS NOT NULL AND data->>'category' != '')
       OR (path_id IS NOT NULL AND path_id != '')
  LOOP
    -- Determine category name (prefer data.category, fallback to path_id)
    category_name := COALESCE(
      NULLIF(integration_record.category, ''),
      NULLIF(integration_record.path_id, '')
    );
    
    -- Skip if no valid category name
    CONTINUE WHEN category_name IS NULL OR category_name = '';
    
    source_id := integration_record.wand_source_id;
    
    -- Check if category already exists for this integration source and category name
    SELECT id INTO existing_category_id
    FROM product_categories
    WHERE integration_source_id = source_id
      AND integration_category_id = category_name
    LIMIT 1;
    
    -- Create category if it doesn't exist
    IF existing_category_id IS NULL THEN
      INSERT INTO product_categories (
        name,
        integration_source_id,
        integration_category_id,
        sort_order
      )
      VALUES (
        category_name,
        source_id,
        category_name,
        0
      )
      RETURNING id INTO v_category_id;
      
      RAISE NOTICE 'Created category: % (ID: %)', category_name, v_category_id;
    ELSE
      v_category_id := existing_category_id;
    END IF;
    
    -- Assign category to all products that reference this integration product
    INSERT INTO product_category_assignments (product_id, category_id)
    SELECT DISTINCT p.id, v_category_id
    FROM products p
    WHERE p.integration_product_id = integration_record.id
    ON CONFLICT (product_id, category_id) DO NOTHING;
    
  END LOOP;
  
  RAISE NOTICE 'Category population completed';
END $$;
