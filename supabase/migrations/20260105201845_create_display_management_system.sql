/*
  # Create Display Management System

  ## Overview
  This migration creates the infrastructure for managing digital displays, media players,
  and their associations with placement groups at the store level.

  ## 1. New Tables

  ### media_players
  - `id` (uuid, primary key) - Unique identifier for each media player device
  - `device_id` (text, unique) - Hardware device identifier
  - `name` (text) - Human-readable name for the media player
  - `ip_address` (inet) - Network IP address
  - `mac_address` (text) - MAC address for network identification
  - `status` (text) - online, offline, error, maintenance
  - `last_heartbeat` (timestamptz) - Last time device checked in
  - `firmware_version` (text) - Current firmware version
  - `placement_group_id` (uuid) - Reference to placement group
  - `store_id` (integer) - Reference to store
  - `metadata` (jsonb) - Additional device configuration
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### displays
  - `id` (uuid, primary key) - Unique identifier for each display
  - `name` (text) - Display name
  - `media_player_id` (uuid) - Reference to media player
  - `display_type_id` (uuid) - Reference to display_types table
  - `position` (integer) - Position index for dual displays (1 or 2)
  - `status` (text) - active, inactive, error
  - `thumbnail_url` (text) - URL to display screenshot
  - `configuration` (jsonb) - Display-specific settings
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### display_actions_log
  - `id` (uuid, primary key) - Unique identifier for each action
  - `display_id` (uuid) - Reference to display
  - `media_player_id` (uuid) - Reference to media player
  - `action_type` (text) - reboot, refresh, clear_storage, settings_change
  - `initiated_by` (text) - User ID who initiated the action
  - `status` (text) - pending, in_progress, completed, failed
  - `error_message` (text) - Error details if action failed
  - `timestamp` (timestamptz) - When action was initiated
  - `completed_at` (timestamptz) - When action finished

  ## 2. Store Operation Status
  - Add `operation_status` field to stores table
  - Values: open, closed, maintenance

  ## 3. Security
  - Enable RLS on all tables
  - Add policies allowing public access to match existing pattern

  ## 4. Indexes
  - Add indexes for efficient querying on foreign keys and status fields
*/

-- Create media_players table
CREATE TABLE IF NOT EXISTS media_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  name text NOT NULL,
  ip_address inet,
  mac_address text,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
  last_heartbeat timestamptz,
  firmware_version text,
  placement_group_id uuid REFERENCES placement_groups(id) ON DELETE SET NULL,
  store_id integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create displays table
CREATE TABLE IF NOT EXISTS displays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  media_player_id uuid REFERENCES media_players(id) ON DELETE CASCADE,
  display_type_id uuid REFERENCES display_types(id) ON DELETE RESTRICT,
  position integer DEFAULT 1 CHECK (position IN (1, 2)),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  thumbnail_url text,
  configuration jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(media_player_id, position)
);

-- Create display_actions_log table
CREATE TABLE IF NOT EXISTS display_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id uuid REFERENCES displays(id) ON DELETE SET NULL,
  media_player_id uuid REFERENCES media_players(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('reboot', 'refresh', 'clear_storage', 'settings_change')),
  initiated_by text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message text,
  timestamp timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Add operation_status to stores table if column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'operation_status'
  ) THEN
    ALTER TABLE stores ADD COLUMN operation_status text DEFAULT 'open' CHECK (operation_status IN ('open', 'closed', 'maintenance'));
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_media_players_store_id ON media_players(store_id);
CREATE INDEX IF NOT EXISTS idx_media_players_placement_group_id ON media_players(placement_group_id);
CREATE INDEX IF NOT EXISTS idx_media_players_status ON media_players(status);
CREATE INDEX IF NOT EXISTS idx_media_players_last_heartbeat ON media_players(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_displays_media_player_id ON displays(media_player_id);
CREATE INDEX IF NOT EXISTS idx_displays_display_type_id ON displays(display_type_id);
CREATE INDEX IF NOT EXISTS idx_display_actions_log_display_id ON display_actions_log(display_id);
CREATE INDEX IF NOT EXISTS idx_display_actions_log_media_player_id ON display_actions_log(media_player_id);
CREATE INDEX IF NOT EXISTS idx_display_actions_log_timestamp ON display_actions_log(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE media_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_actions_log ENABLE ROW LEVEL SECURITY;

-- Create policies allowing public access (matching existing pattern)
CREATE POLICY "Allow public access to media_players"
  ON media_players FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to displays"
  ON displays FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to display_actions_log"
  ON display_actions_log FOR ALL
  USING (true)
  WITH CHECK (true);