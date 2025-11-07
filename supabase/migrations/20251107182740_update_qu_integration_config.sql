/*
  # Update Qu Integration Source Configuration

  1. Changes
    - Remove optional_config_fields (modified_date, time_of_day) - these will be handled by ETL layer
    - Set auth_method to 'none' since authentication is handled by ETL layer
    - Keep only required fields: brand and establishment
    
  2. Rationale
    - Brand and Establishment are required for Qu API endpoint construction
    - Authentication and optional parameters are managed by the ETL layer
    - Simplifies user configuration experience
*/

-- Update Qu integration source
UPDATE wand_integration_sources
SET 
  auth_method = 'none',
  optional_config_fields = '[]'::jsonb
WHERE integration_type = 'qu';