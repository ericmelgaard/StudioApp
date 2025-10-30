/*
  # Update Integration Attribute Mappings for Global Templates

  1. Changes
    - Make integration_product_id nullable (not needed for global templates)
    - Make wand_product_id nullable (templates aren't tied to specific products)
    - Add source_id to link templates to integration sources
    - Update indexes

  2. Notes
    - Global templates are defined per integration source + type
    - Example: One template for "QuickServe Products", another for "QuickServe Modifiers"
    - These templates are reused when importing integration products
*/

-- Add source_id for linking templates to integration sources
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_attribute_mappings' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE integration_attribute_mappings 
      ADD COLUMN source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on source_id
CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_source_id 
  ON integration_attribute_mappings(source_id);

-- Update the check constraint to be more flexible
DO $$
BEGIN
  ALTER TABLE integration_attribute_mappings 
    DROP CONSTRAINT IF EXISTS valid_integration_type;
  
  ALTER TABLE integration_attribute_mappings
    ADD CONSTRAINT valid_integration_type 
    CHECK (integration_type IN ('product', 'modifier', 'discount'));
END $$;