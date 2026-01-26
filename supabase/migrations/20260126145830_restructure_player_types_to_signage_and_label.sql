/*
  # Restructure Player Types to Signage and Label

  1. Changes
    - Update `player_type` constraint to only allow 'signage' and 'label'
    - Add `is_webview_kiosk` boolean field to media_players (signage players can be webview kiosks)
    - Migrate any existing 'webview_kiosk' players to 'signage' type with is_webview_kiosk = true
    - Update validation functions to reflect new structure
    - Remove webview_kiosk from the player_type check constraint

  2. Notes
    - Signage players can function as webview kiosks (is_webview_kiosk = true)
    - Smart label players cannot be webview kiosks
    - This provides clearer separation for UI and setup workflows
*/

-- First, migrate any webview_kiosk players to signage
UPDATE media_players 
SET player_type = 'signage'
WHERE player_type = 'webview_kiosk';

-- Add is_webview_kiosk field to media_players
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_players' AND column_name = 'is_webview_kiosk'
  ) THEN
    ALTER TABLE media_players 
    ADD COLUMN is_webview_kiosk boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Drop the old constraint
ALTER TABLE media_players DROP CONSTRAINT IF EXISTS media_players_player_type_check;

-- Add new constraint with only signage and label
ALTER TABLE media_players 
ADD CONSTRAINT media_players_player_type_check 
CHECK (player_type IN ('signage', 'label'));

-- Create index for webview kiosk filtering
CREATE INDEX IF NOT EXISTS idx_media_players_is_webview_kiosk ON media_players(is_webview_kiosk) WHERE is_webview_kiosk = true;

-- Update validation function to work with new structure
CREATE OR REPLACE FUNCTION validate_display_player_compatibility()
RETURNS TRIGGER AS $$
DECLARE
  v_player_type text;
  v_display_category text;
BEGIN
  -- Get the player type
  SELECT player_type INTO v_player_type
  FROM media_players
  WHERE id = NEW.media_player_id;

  -- Get the display category
  SELECT display_category INTO v_display_category
  FROM display_types
  WHERE id = NEW.display_type_id;

  -- Label players can only use label display types
  IF v_player_type = 'label' AND v_display_category != 'label' THEN
    RAISE EXCEPTION 'Smart label players can only be assigned label display types';
  END IF;

  -- Label display types can only be assigned to label players
  IF v_display_category = 'label' AND v_player_type != 'label' THEN
    RAISE EXCEPTION 'Label display types can only be assigned to smart label players';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the get_available_display_types_for_player function
CREATE OR REPLACE FUNCTION get_available_display_types_for_player(player_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  display_category text,
  specifications jsonb,
  status text
) AS $$
DECLARE
  v_player_type text;
BEGIN
  -- Get the player type
  SELECT mp.player_type INTO v_player_type
  FROM media_players mp
  WHERE mp.id = player_id;

  -- Return display types that match the player type
  RETURN QUERY
  SELECT 
    dt.id,
    dt.name,
    dt.description,
    dt.category,
    dt.display_category,
    dt.specifications,
    dt.status
  FROM display_types dt
  WHERE 
    (v_player_type = 'label' AND dt.display_category = 'label')
    OR (v_player_type = 'signage' AND dt.display_category = 'signage')
  AND dt.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the structure
COMMENT ON COLUMN media_players.player_type IS 'Type of media player: signage (for digital signage displays) or label (for electronic shelf labels). Signage players can optionally function as webview kiosks.';
COMMENT ON COLUMN media_players.is_webview_kiosk IS 'Whether this signage player is configured to function as a webview kiosk. Only applicable to signage players.';
