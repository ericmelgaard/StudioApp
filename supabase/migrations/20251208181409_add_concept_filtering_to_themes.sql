/*
  # Add Concept-Level Filtering to Themes

  1. Changes
    - Add `concept_id` column to `themes` table to associate themes with specific concepts
    - Update the Grill theme to be owned by WAND Development (concept_id = 214)
    - Update RLS policies to filter themes based on concept hierarchy
    
  2. Security
    - Users can only view themes from their concept or parent concepts in the hierarchy
    - Users can only modify themes within their concept scope
    - Ensures proper data isolation between different concept organizations

  3. Notes
    - Themes without a concept_id (NULL) are considered global and visible to all
    - The concept hierarchy is traversed using parent_key relationships
*/

-- Add concept_id column to themes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'concept_id'
  ) THEN
    ALTER TABLE themes ADD COLUMN concept_id bigint REFERENCES concepts(id);
  END IF;
END $$;

-- Update the Grill theme to be owned by WAND Development (concept_id = 214)
UPDATE themes
SET concept_id = 214
WHERE name = 'Grill';

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view themes" ON themes;
DROP POLICY IF EXISTS "Users can insert themes" ON themes;
DROP POLICY IF EXISTS "Users can update themes" ON themes;
DROP POLICY IF EXISTS "Users can delete themes" ON themes;

-- Create new RLS policies with concept-based filtering

-- SELECT policy: Users can view themes from their concept or parent concepts
CREATE POLICY "Users can view themes in their concept hierarchy"
  ON themes FOR SELECT
  TO authenticated
  USING (
    concept_id IS NULL OR
    concept_id IN (
      SELECT COALESCE(user_profiles.concept_id, 0)
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN concepts user_concept ON up.concept_id = user_concept.id
      WHERE up.id = auth.uid()
        AND themes.concept_id IN (
          SELECT id FROM concepts
          WHERE id = user_concept.id
             OR id = user_concept.parent_key
             OR parent_key = user_concept.id
        )
    )
  );

-- INSERT policy: Users can create themes in their concept
CREATE POLICY "Users can create themes in their concept"
  ON themes FOR INSERT
  TO authenticated
  WITH CHECK (
    concept_id IS NULL OR
    concept_id IN (
      SELECT COALESCE(user_profiles.concept_id, 0)
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- UPDATE policy: Users can update themes in their concept
CREATE POLICY "Users can update themes in their concept"
  ON themes FOR UPDATE
  TO authenticated
  USING (
    concept_id IS NULL OR
    concept_id IN (
      SELECT COALESCE(user_profiles.concept_id, 0)
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    concept_id IS NULL OR
    concept_id IN (
      SELECT COALESCE(user_profiles.concept_id, 0)
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- DELETE policy: Users can delete themes in their concept
CREATE POLICY "Users can delete themes in their concept"
  ON themes FOR DELETE
  TO authenticated
  USING (
    concept_id IS NULL OR
    concept_id IN (
      SELECT COALESCE(user_profiles.concept_id, 0)
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );
