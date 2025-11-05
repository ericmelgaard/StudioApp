/*
  # Seed Qu Integration Source

  1. Purpose
    - Add Qu POS API as the initial integration source
    - Ensure existing integration products reference this source

  2. Changes
    - Insert Qu integration source with configuration
    - Location 100020 is hardcoded until location hierarchy is implemented
    - Set source as active with proper configuration details

  3. Notes
    - Source ID will be generated automatically
    - Config stores endpoint and location information
    - Existing integration_products should already reference this source
*/

-- Insert Qu integration source
INSERT INTO integration_sources (name, type, status, config, last_sync_at)
VALUES (
  'Qu POS API',
  'api',
  'active',
  jsonb_build_object(
    'endpoint', 'https://api.qu.com/v1',
    'source_location', '100020',
    'sync_frequency', 'Every 15 minutes',
    'schedule', 'Every 15 min during business hours'
  ),
  now() - interval '2 minutes'
)
ON CONFLICT DO NOTHING;
