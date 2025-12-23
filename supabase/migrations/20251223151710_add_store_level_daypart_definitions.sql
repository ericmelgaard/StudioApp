/*
  # Add Store-Level Daypart Definitions Support

  ## Changes

  1. Schema Updates
    - Add `store_id` column to `daypart_definitions` table
    - Add unique index to enforce name uniqueness per scope (global/concept/store)
    - Add index on `store_id` for performance

  2. Definition Resolution
    - Create `get_effective_daypart_definitions()` function to resolve definitions with proper inheritance
    - Store-specific definitions override concept-level, which override global

  3. Security
    - Update RLS policies to allow stores to view and manage their own definitions
    - Stores can view global and concept-level definitions (read-only)
    - Stores can create, edit, and delete their own store-specific definitions
*/

-- Add store_id column to daypart_definitions
ALTER TABLE daypart_definitions
ADD COLUMN IF NOT EXISTS store_id bigint REFERENCES stores(id) ON DELETE CASCADE;

-- Drop old constraint if exists
ALTER TABLE daypart_definitions
DROP CONSTRAINT IF EXISTS unique_daypart_name_per_scope;

-- Create unique index to enforce name uniqueness per scope
-- This allows same name at different scopes (global, concept, store)
DROP INDEX IF EXISTS idx_unique_daypart_name_per_scope;

CREATE UNIQUE INDEX idx_unique_daypart_name_per_scope
ON daypart_definitions (daypart_name, COALESCE(store_id, 0), COALESCE(concept_id, 0));

-- Add index for store_id lookups
CREATE INDEX IF NOT EXISTS idx_daypart_definitions_store_id
ON daypart_definitions(store_id)
WHERE store_id IS NOT NULL;

-- Create function to get effective daypart definitions for a store
-- This returns definitions with proper inheritance: store > concept > global
CREATE OR REPLACE FUNCTION get_effective_daypart_definitions(p_store_id bigint)
RETURNS TABLE (
  id uuid,
  daypart_name text,
  display_name text,
  color text,
  icon text,
  start_time time,
  end_time time,
  days_of_week text[],
  sort_order integer,
  store_id bigint,
  concept_id bigint,
  source_level text,
  is_customized boolean,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Get the concept_id for the store
  DECLARE
    v_concept_id bigint;
  BEGIN
    SELECT s.concept_id INTO v_concept_id
    FROM stores s
    WHERE s.id = p_store_id;

    -- Return definitions with priority: store > concept > global
    RETURN QUERY
    WITH ranked_definitions AS (
      SELECT
        d.id,
        d.daypart_name,
        d.display_name,
        d.color,
        d.icon,
        d.start_time,
        d.end_time,
        d.days_of_week,
        d.sort_order,
        d.store_id,
        d.concept_id,
        CASE
          WHEN d.store_id IS NOT NULL THEN 'store'
          WHEN d.concept_id IS NOT NULL THEN 'concept'
          ELSE 'global'
        END as source_level,
        CASE
          WHEN d.store_id IS NOT NULL THEN true
          ELSE false
        END as is_customized,
        d.created_at,
        d.updated_at,
        ROW_NUMBER() OVER (
          PARTITION BY d.daypart_name
          ORDER BY
            CASE
              WHEN d.store_id = p_store_id THEN 1
              WHEN d.concept_id = v_concept_id THEN 2
              WHEN d.store_id IS NULL AND d.concept_id IS NULL THEN 3
              ELSE 4
            END
        ) as priority
      FROM daypart_definitions d
      WHERE
        d.store_id = p_store_id
        OR d.concept_id = v_concept_id
        OR (d.store_id IS NULL AND d.concept_id IS NULL)
    )
    SELECT
      rd.id,
      rd.daypart_name,
      rd.display_name,
      rd.color,
      rd.icon,
      rd.start_time,
      rd.end_time,
      rd.days_of_week,
      rd.sort_order,
      rd.store_id,
      rd.concept_id,
      rd.source_level,
      rd.is_customized,
      rd.created_at,
      rd.updated_at
    FROM ranked_definitions rd
    WHERE rd.priority = 1
    ORDER BY rd.sort_order, rd.display_name;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for daypart_definitions

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to daypart definitions" ON daypart_definitions;
DROP POLICY IF EXISTS "Allow authenticated users to manage daypart definitions" ON daypart_definitions;

-- Allow everyone to read global and concept-level definitions
CREATE POLICY "Allow read access to global and concept definitions"
ON daypart_definitions FOR SELECT
USING (store_id IS NULL);

-- Allow stores to read their own definitions
CREATE POLICY "Allow stores to read own definitions"
ON daypart_definitions FOR SELECT
USING (store_id IN (
  SELECT id FROM stores WHERE concept_id IN (
    SELECT concept_id FROM stores WHERE id = store_id
  )
));

-- Allow stores to insert their own definitions
CREATE POLICY "Allow stores to create own definitions"
ON daypart_definitions FOR INSERT
WITH CHECK (
  store_id IN (SELECT id FROM stores)
  AND concept_id IS NULL
);

-- Allow stores to update only their own definitions
CREATE POLICY "Allow stores to update own definitions"
ON daypart_definitions FOR UPDATE
USING (store_id IN (SELECT id FROM stores))
WITH CHECK (store_id IN (SELECT id FROM stores));

-- Allow stores to delete only their own definitions
CREATE POLICY "Allow stores to delete own definitions"
ON daypart_definitions FOR DELETE
USING (store_id IN (SELECT id FROM stores));

-- Allow admins to manage all definitions (global, concept, store)
CREATE POLICY "Allow admins to manage all definitions"
ON daypart_definitions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);
