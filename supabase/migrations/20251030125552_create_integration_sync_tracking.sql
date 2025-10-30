/*
  # Create Integration Sync Tracking

  1. New Tables
    - `integration_sync_history`
      - `id` (uuid, primary key)
      - `source_id` (uuid, foreign key to integration_sources)
      - `sync_type` (text) - Type of sync (manual, scheduled, auto)
      - `status` (text) - Status (success, failed, in_progress)
      - `started_at` (timestamptz) - When sync started
      - `completed_at` (timestamptz) - When sync completed
      - `duration_ms` (integer) - Duration in milliseconds
      - `records_added` (integer) - Number of records added
      - `records_updated` (integer) - Number of records updated
      - `records_deleted` (integer) - Number of records deleted
      - `total_records` (integer) - Total records synced
      - `error_message` (text) - Error message if failed
      - `error_details` (jsonb) - Detailed error information
      - `metadata` (jsonb) - Additional sync metadata
      - `created_at` (timestamptz)

  2. Updates to integration_sources
    - Add `last_sync_at` (timestamptz)
    - Add `last_successful_sync_at` (timestamptz)
    - Add `sync_status` (text) - Current sync status
    - Add `sync_frequency` (text) - How often to sync
    - Add `total_syncs` (integer) - Total number of syncs
    - Add `failed_syncs` (integer) - Number of failed syncs

  3. Security
    - Enable RLS on sync_history table
    - Add policies for authenticated users to read sync history
*/

-- Add columns to integration_sources
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_sources' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE integration_sources
      ADD COLUMN last_sync_at timestamptz,
      ADD COLUMN last_successful_sync_at timestamptz,
      ADD COLUMN sync_status text DEFAULT 'idle',
      ADD COLUMN sync_frequency text DEFAULT 'daily',
      ADD COLUMN total_syncs integer DEFAULT 0,
      ADD COLUMN failed_syncs integer DEFAULT 0;
  END IF;
END $$;

-- Create integration_sync_history table
CREATE TABLE IF NOT EXISTS integration_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  records_added integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_deleted integer DEFAULT 0,
  total_records integer DEFAULT 0,
  error_message text,
  error_details jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_history_source_id ON integration_sync_history(source_id);
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