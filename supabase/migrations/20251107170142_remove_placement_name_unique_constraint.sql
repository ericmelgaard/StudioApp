/*
  # Remove Unique Constraint on Placement Name

  1. Changes
    - Drop the unique constraint on `placement_groups.name`
    - Placement names can now be duplicated across different stores
    - This allows multiple stores to have placements with the same name (e.g., "Front Counter", "Dining Area")

  2. Rationale
    - Placements are scoped to stores via `store_id`
    - Different stores should be able to use the same placement names
    - Uniqueness should be enforced at the store level, not globally
*/

-- Drop the unique constraint on name
ALTER TABLE placement_groups 
  DROP CONSTRAINT IF EXISTS placement_groups_name_key;

-- Optionally add a unique constraint scoped to store_id
-- This ensures unique names within a store but allows duplicates across stores
CREATE UNIQUE INDEX IF NOT EXISTS placement_groups_name_store_unique 
  ON placement_groups(name, store_id) 
  WHERE store_id IS NOT NULL;