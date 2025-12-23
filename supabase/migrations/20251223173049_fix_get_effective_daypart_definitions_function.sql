/*
  # Fix get_effective_daypart_definitions function

  1. Changes
    - Remove references to deleted columns (start_time, end_time, days_of_week)
    - Update return type to only include columns that exist after unification
    - Keep all other logic intact for inheritance hierarchy

  2. Impact
    - Fixes "column does not exist" errors when loading daypart definitions
    - Function now works with the unified schedule system
*/

-- Drop the old function
DROP FUNCTION IF EXISTS get_effective_daypart_definitions(bigint);

-- Recreate function without the removed columns
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
