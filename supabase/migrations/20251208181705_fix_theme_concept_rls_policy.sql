/*
  # Fix Theme Concept-Level RLS Policy

  1. Changes
    - Update the SELECT RLS policy to properly check concept hierarchy
    - Include checks for users whose company is associated with the theme's concept
    - Ensure users in child companies can access parent concept themes
    
  2. Security
    - Users can view themes from their concept (via concept_id or company's concept_id)
    - Users can view themes from parent or child concepts in the hierarchy
    - Themes without a concept_id remain globally visible

  3. Notes
    - Simplified the policy logic for better performance
    - Added company-to-concept relationship checking
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view themes in their concept hierarchy" ON themes;

-- Create improved SELECT policy with proper concept hierarchy checking
CREATE POLICY "Users can view themes in their concept hierarchy"
  ON themes FOR SELECT
  TO authenticated
  USING (
    -- Global themes (no concept_id) are visible to all
    concept_id IS NULL 
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
