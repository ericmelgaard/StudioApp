/*
  # Fix get_effective_daypart_definitions function - remove concept_id dependency

  1. Changes
    - Remove reference to stores.concept_id (column doesn't exist)
    - Simplify inheritance to just store-specific > global
    - Remove concept-level from the hierarchy for now

  2. Impact
    - Function will work with current stores table structure
    - Returns store-specific overrides when they exist, otherwise global definitions
*/

-- Drop the old function
DROP FUNCTION IF EXISTS get_effective_daypart_definitions(bigint);

-- Recreate function without concept inheritance
CREATE OR REPLACE FUNCTION get_effective_daypart_definitions(p_store_id bigint)
RETURNS TABLE (
  id uuid,
  daypart_name text,
  display_label text,
  color text,
  icon text,
  sort_order integer,
  store_id bigint,
  concept_id bigint,
  source_level text,
  is_customized boolean,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Return definitions with priority: store > global
  RETURN QUERY
  WITH ranked_definitions AS (
    SELECT
      d.id,
      d.daypart_name,
      d.display_label,
      d.color,
      d.icon,
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
            WHEN d.store_id IS NULL AND d.concept_id IS NULL THEN 2
            ELSE 3
          END
      ) as priority
    FROM daypart_definitions d
    WHERE
      d.store_id = p_store_id
      OR (d.store_id IS NULL AND d.concept_id IS NULL)
  )
  SELECT
    rd.id,
    rd.daypart_name,
    rd.display_label,
    rd.color,
    rd.icon,
    rd.sort_order,
    rd.store_id,
    rd.concept_id,
    rd.source_level,
    rd.is_customized,
    rd.created_at,
    rd.updated_at
  FROM ranked_definitions rd
  WHERE rd.priority = 1
  ORDER BY rd.sort_order, rd.display_label;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
