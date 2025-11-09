/*
  # Create Integration Sync History Table

  1. New Tables
    - `integration_sync_history`
      - `id` (uuid, primary key) - Unique sync record ID
      - `source_name` (text) - Name of the integration source
      - `source_config_id` (uuid) - FK to integration_source_configs
      - `status` (text) - Sync status (in_progress, success, failed)
      - `started_at` (timestamptz) - When the sync started
      - `completed_at` (timestamptz) - When the sync completed
      - `items_synced` (integer) - Number of items synced
      - `error_message` (text) - Error message if failed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on integration_sync_history table
    - Add policies to allow anyone to view, insert, and update sync history
*/

-- Create integration_sync_history table
CREATE TABLE IF NOT EXISTS integration_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_config_id uuid REFERENCES integration_source_configs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  items_synced integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_history_config_id ON integration_sync_history(source_config_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_status ON integration_sync_history(status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_started_at ON integration_sync_history(started_at DESC);

ALTER TABLE integration_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration sync history"
  ON integration_sync_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert integration sync history"
  ON integration_sync_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration sync history"
  ON integration_sync_history FOR UPDATE
  USING (true)
  WITH CHECK (true);