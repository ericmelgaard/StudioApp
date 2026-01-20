/*
  # Move Placement Group Relationship from Media Players to Displays

  1. Changes
    - Add `placement_group_id` column to `displays` table
    - Migrate existing placement group assignments from media_players to displays
    - Remove `placement_group_id` column from `media_players` table

  2. Rationale
    - Placement groups should contain displays, not media players
    - A media player can have multiple displays, each potentially in different groups
    - This aligns the data model with the actual business logic

  3. Migration Steps
    - Add placement_group_id to displays with foreign key to placement_groups
    - Copy placement_group_id from each media_player to all its displays
    - Drop placement_group_id from media_players table
*/

-- Step 1: Add placement_group_id to displays table
ALTER TABLE displays
ADD COLUMN IF NOT EXISTS placement_group_id uuid REFERENCES placement_groups(id) ON DELETE SET NULL;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_displays_placement_group_id ON displays(placement_group_id);

-- Step 3: Migrate data from media_players to displays
-- For each display, inherit the placement_group_id from its media_player
UPDATE displays d
SET placement_group_id = mp.placement_group_id
FROM media_players mp
WHERE d.media_player_id = mp.id
AND mp.placement_group_id IS NOT NULL
AND d.placement_group_id IS NULL;

-- Step 4: Remove placement_group_id from media_players
ALTER TABLE media_players
DROP COLUMN IF EXISTS placement_group_id;
