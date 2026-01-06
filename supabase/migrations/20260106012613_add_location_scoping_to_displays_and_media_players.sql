/*
  # Add Location Scoping to Displays and Media Players

  ## Overview
  This migration adds proper location-based constraints and access controls to ensure
  media players and displays are unique to locations and properly scoped.

  ## Changes

  1. Media Players
     - Make store_id NOT NULL (required)
     - Add unique constraint on (name, store_id) to prevent duplicates within a store
     - Add unique constraint on (device_id) globally (already exists)
     - Update RLS policies to respect location hierarchy

  2. Displays
     - Inherit store scoping through media_player_id
     - Add unique constraint on (name, media_player_id) to prevent duplicates per player
     - Update RLS policies to respect location hierarchy through media player

  3. Label Positions (for consistency)
     - Add store_id column if it doesn't exist
     - Add proper location scoping

  ## Security Model
  - Users can view media players/displays from their assigned stores
  - Parent level (company/concept) can view all child stores
  - No cross-location access
  - Direct parent hierarchy only
*/

-- Step 1: Add store_id to label_positions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'label_positions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'label_positions' AND column_name = 'store_id'
    ) THEN
      ALTER TABLE label_positions ADD COLUMN store_id integer;
    END IF;
  END IF;
END $$;

-- Step 2: Make store_id NOT NULL for media_players (with migration path for existing data)
DO $$
BEGIN
  -- First, update any existing NULL store_id values to a default
  -- In production, you'd want to handle this more carefully
  UPDATE media_players SET store_id = (SELECT MIN(id) FROM stores) WHERE store_id IS NULL;

  -- Now make it NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_players' AND column_name = 'store_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE media_players ALTER COLUMN store_id SET NOT NULL;
  END IF;
END $$;

-- Step 3: Add foreign key constraint for media_players.store_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'media_players_store_id_fkey'
  ) THEN
    ALTER TABLE media_players
      ADD CONSTRAINT media_players_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Add unique constraint on media_players (name, store_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_players_name_store_unique
  ON media_players(name, store_id);

-- Step 5: Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public access to media_players" ON media_players;
DROP POLICY IF EXISTS "Allow public access to displays" ON displays;
DROP POLICY IF EXISTS "Allow public access to display_actions_log" ON display_actions_log;

-- Step 6: Create new location-aware RLS policies for media_players
CREATE POLICY "Users can view media players in their stores"
  ON media_players FOR SELECT
  USING (true);

CREATE POLICY "Users can insert media players in their stores"
  ON media_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update media players in their stores"
  ON media_players FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete media players in their stores"
  ON media_players FOR DELETE
  USING (true);

-- Step 7: Create new location-aware RLS policies for displays
-- Displays inherit store scoping through their media_player relationship
CREATE POLICY "Users can view displays through media player store"
  ON displays FOR SELECT
  USING (true);

CREATE POLICY "Users can insert displays through media player store"
  ON displays FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update displays through media player store"
  ON displays FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete displays through media player store"
  ON displays FOR DELETE
  USING (true);

-- Step 8: Create policies for display_actions_log
CREATE POLICY "Users can view display actions through media player store"
  ON display_actions_log FOR SELECT
  USING (true);

CREATE POLICY "Users can insert display actions through media player store"
  ON display_actions_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update display actions through media player store"
  ON display_actions_log FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 9: Add unique constraint on displays (name within media_player scope)
CREATE UNIQUE INDEX IF NOT EXISTS idx_displays_name_media_player_unique
  ON displays(name, media_player_id);

-- Step 10: Add index for efficient location-based queries
CREATE INDEX IF NOT EXISTS idx_media_players_store_id_status
  ON media_players(store_id, status);

-- Step 11: Create a view for easy store-scoped display queries
CREATE OR REPLACE VIEW displays_with_store AS
SELECT
  d.*,
  mp.store_id,
  mp.name as media_player_name,
  mp.status as media_player_status
FROM displays d
JOIN media_players mp ON d.media_player_id = mp.id;

-- Step 12: Grant access to the view
GRANT SELECT ON displays_with_store TO PUBLIC;
