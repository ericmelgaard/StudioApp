/*
  # Add Admin Access to Themes

  1. Changes
    - Update RLS policy to allow users with null concept_id (admins) to view all themes
    - This enables super-admin level access across all concepts
    
  2. Security
    - Users with concept_id = null can view all themes
    - Regular users still restricted to their concept hierarchy
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view themes in their concept hierarchy" ON themes;

-- Create improved SELECT policy with admin access
CREATE POLICY "Users can view themes in their concept hierarchy"
  ON themes FOR SELECT
  TO authenticated
  USING (
    -- Global themes (no concept_id) are visible to all
    concept_id IS NULL 
    OR
    -- Admin users (with null concept_id) can see all themes
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.concept_id IS NULL
        AND up.company_id IS NULL
    )
    OR
    -- User's direct concept_id matches theme's concept_id
    concept_id IN (
      SELECT up.concept_id
      FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.concept_id IS NOT NULL
    )
    OR
    -- User's company's concept_id matches theme's concept_id
    concept_id IN (
      SELECT c.concept_id
      FROM user_profiles up
      JOIN companies c ON up.company_id = c.id
      WHERE up.id = auth.uid()
        AND c.concept_id IS NOT NULL
    )
    OR
    -- User's concept is a child of the theme's concept
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN concepts user_concept ON up.concept_id = user_concept.id
      WHERE up.id = auth.uid()
        AND user_concept.parent_key = themes.concept_id
    )
    OR
    -- User's company's concept is a child of the theme's concept
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN companies c ON up.company_id = c.id
      JOIN concepts company_concept ON c.concept_id = company_concept.id
      WHERE up.id = auth.uid()
        AND company_concept.parent_key = themes.concept_id
    )
  );
