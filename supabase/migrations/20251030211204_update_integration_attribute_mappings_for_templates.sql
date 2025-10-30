/*
  # Update Integration Attribute Mappings for Global Templates
*/

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

CREATE INDEX IF NOT EXISTS idx_integration_attr_mappings_source_id 
  ON integration_attribute_mappings(source_id);

DO $$
BEGIN
  ALTER TABLE integration_attribute_mappings 
    DROP CONSTRAINT IF EXISTS valid_integration_type;
  
  ALTER TABLE integration_attribute_mappings
    ADD CONSTRAINT valid_integration_type 
    CHECK (integration_type IN ('product', 'modifier', 'discount'));
END $$;