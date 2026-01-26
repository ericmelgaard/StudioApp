/*
  # Add Player Type to Media Players System

  1. Changes
    - Add `player_type` field to `media_players` table with values: 'signage', 'label', 'webview_kiosk'
    - Add `display_category` field to `display_types` table with values: 'signage', 'label'
    - Update existing media_players to have player_type = 'signage' as default
    - Categorize existing display_types based on their category field
    - Add indexes for efficient querying
    - Create validation function to ensure label players only use label display types

  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Add player_type to media_players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_players' AND column_name = 'player_type'
  ) THEN
    ALTER TABLE media_players 
    ADD COLUMN player_type text DEFAULT 'signage' 
    CHECK (player_type IN ('signage', 'label', 'webview_kiosk'));
  END IF;
END $$;

-- Add display_category to display_types table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'display_types' AND column_name = 'display_category'
  ) THEN
    ALTER TABLE display_types 
    ADD COLUMN display_category text DEFAULT 'signage' 
    CHECK (display_category IN ('signage', 'label'));
  END IF;
END $$;

-- Update existing display_types to set display_category based on category field
UPDATE display_types 
SET display_category = CASE 
  WHEN category = 'esl' THEN 'label'
  WHEN category LIKE '%label%' THEN 'label'
  ELSE 'signage'
END
WHERE display_category IS NULL OR display_category = 'signage';

-- Set all existing media_players to signage type if not already set
UPDATE media_players 
SET player_type = 'signage' 
WHERE player_type IS NULL;

-- Make player_type NOT NULL now that all rows have values
ALTER TABLE media_players ALTER COLUMN player_type SET NOT NULL;

-- Make display_category NOT NULL now that all rows have values
ALTER TABLE display_types ALTER COLUMN display_category SET NOT NULL;

-- Create index for efficient querying by player type
CREATE INDEX IF NOT EXISTS idx_media_players_player_type ON media_players(player_type);

-- Create index for efficient querying by display category
CREATE INDEX IF NOT EXISTS idx_display_types_display_category ON display_types(display_category);

-- Create validation function to check display type compatibility with player type
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
    RAISE EXCEPTION 'Label players can only be assigned label display types';
  END IF;

  -- Label display types can only be assigned to label players
  IF v_display_category = 'label' AND v_player_type != 'label' THEN
    RAISE EXCEPTION 'Label display types can only be assigned to label players';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate display-player compatibility on insert and update
DROP TRIGGER IF EXISTS check_display_player_compatibility ON displays;
CREATE TRIGGER check_display_player_compatibility
  BEFORE INSERT OR UPDATE OF media_player_id, display_type_id ON displays
  FOR EACH ROW
  EXECUTE FUNCTION validate_display_player_compatibility();

-- Create function to get available display types for a player
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
    OR (v_player_type IN ('signage', 'webview_kiosk') AND dt.display_category = 'signage')
  AND dt.status = 'active';
END;
$$ LANGUAGE plpgsql;
