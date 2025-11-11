-- Fix foreign key relationships for integration_source_configs

-- Drop the old wand_integration_source_id column if it exists
ALTER TABLE integration_source_configs DROP COLUMN IF EXISTS wand_integration_source_id;

-- Add foreign key constraint to wand_source_id
ALTER TABLE integration_source_configs 
  ADD CONSTRAINT fk_integration_source_configs_wand_source 
  FOREIGN KEY (wand_source_id) 
  REFERENCES wand_integration_sources(id)
  ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_integration_source_configs_wand_source_id 
  ON integration_source_configs(wand_source_id);
