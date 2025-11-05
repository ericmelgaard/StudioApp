/*
  # Seed Integration Sources

  1. Purpose
    - Add Qu POS API as the initial integration source
    - Add Symphony as an additional integration source
    - Ensure existing integration products reference these sources

  2. Changes
    - Insert Qu POS API integration source with configuration
    - Insert Symphony integration source with configuration
    - Location 100020 is hardcoded until location hierarchy is implemented
    - Set both sources as active with proper configuration details

  3. Notes
    - Source IDs will be generated automatically
    - Config stores endpoint and location information
    - Existing integration_products should reference these sources
*/

-- Insert Qu POS API integration source
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

-- Insert Symphony integration source
INSERT INTO integration_sources (name, type, status, config, last_sync_at)
VALUES (
  'Symphony',
  'api',
  'active',
  jsonb_build_object(
    'endpoint', 'https://api.symphony.com/v1',
    'source_location', '100020',
    'sync_frequency', 'Every 30 minutes',
    'schedule', 'Every 30 min during business hours'
  ),
  now() - interval '5 minutes'
)
ON CONFLICT DO NOTHING;