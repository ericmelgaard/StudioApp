/*
  # Update Product Categories for Multi-Source Linking

  1. Changes
    - Add local_fields array to track custom (non-syncing) fields
    - Add active_integration_source_id to track which source is currently active
    - Add last_synced_at timestamp for sync tracking
    - Add mapping_id for the active source mapping
    - Add integration_type for the active source type
    - Remove display_name (name is now the syncing attribute)
    
  2. Notes
    - Categories now work like products with multi-source support
    - Name field can sync from API or be custom (tracked in local_fields)
    - Old integration_source_id and integration_category_id kept for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'local_fields'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN local_fields text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'active_integration_source_id'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN active_integration_source_id uuid REFERENCES wand_integration_sources(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN last_synced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'mapping_id'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN mapping_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'integration_type'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN integration_type text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE product_categories DROP COLUMN display_name;
  END IF;
END $$;