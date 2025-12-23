/*
  # Fix get_effective_daypart_definitions function

  ## Changes
  - Update function to use correct column names from daypart_definitions table
  - Fix store-to-concept relationship using parent_key instead of concept_id
*/

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS get_effective_daypart_definitions(bigint);

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
DECLARE
  v_concept_id bigint;
BEGIN
  -- Get the concept_id for the store (using parent_key)
  SELECT s.parent_key INTO v_concept_id
  FROM stores s
  WHERE s.id = p_store_id;

  -- Return definitions with priority: store > concept > global
  RETURN QUERY
  WITH ranked_definitions AS (
    SELECT
      d.id,
      d.daypart_name,
      d.display_label as display_name,
      d.color,
      d.icon,
      d.default_start_time as start_time,
      d.default_end_time as end_time,
      d.default_days as days_of_week,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
