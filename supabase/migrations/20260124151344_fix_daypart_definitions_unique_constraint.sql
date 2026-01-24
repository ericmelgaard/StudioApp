/*
  # Fix Daypart Definitions Unique Constraint

  1. Changes
    - Drop the global unique constraint on daypart_name
    - Add a composite unique constraint that allows the same daypart_name at different levels
    - The constraint ensures uniqueness within each scope (global, concept, store)

  2. Notes
    - This allows "breakfast" to exist as a global definition, concept-specific definition, and store-specific definition
    - The COALESCE ensures NULL values are treated consistently in the unique constraint
*/

-- Drop the existing unique constraint on daypart_name
ALTER TABLE daypart_definitions DROP CONSTRAINT IF EXISTS daypart_definitions_daypart_name_key;

-- Add a new composite unique constraint that allows the same daypart_name at different organizational levels
-- This ensures uniqueness within each scope: global (both NULL), concept-level, or store-level
CREATE UNIQUE INDEX IF NOT EXISTS daypart_definitions_unique_per_scope
  ON daypart_definitions (daypart_name, COALESCE(concept_id, -1), COALESCE(store_id, -1));
