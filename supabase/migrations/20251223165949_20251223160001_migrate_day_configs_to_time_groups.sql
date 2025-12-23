/*
  # Migrate Day Configurations to Time Groups

  1. Strategy
    - Convert individual day configurations to grouped format
    - Group consecutive days with same times together
    - Preserve all existing timing information
    - Create default time groups from daypart_definitions.default_* fields

  2. Algorithm
    - For each daypart definition:
      a. Check if it has day-specific configurations
      b. If yes, intelligently group by matching times
      c. If no, create single time group with all default_days
*/

DO $$
DECLARE
  r_daypart RECORD;
  r_day_config RECORD;
  v_time_groups_map jsonb;
  v_time_key text;
  v_days_array integer[];
BEGIN
  FOR r_daypart IN
    SELECT id, daypart_name, default_start_time, default_end_time, default_days
    FROM daypart_definitions
    WHERE store_id IS NULL AND concept_id IS NULL
    ORDER BY id
  LOOP
    RAISE NOTICE 'Processing daypart: %', r_daypart.daypart_name;

    IF EXISTS (
      SELECT 1 FROM daypart_day_configurations
      WHERE daypart_definition_id = r_daypart.id
    ) THEN
      v_time_groups_map := '{}'::jsonb;

      FOR r_day_config IN
        SELECT day_of_week, start_time, end_time
        FROM daypart_day_configurations
        WHERE daypart_definition_id = r_daypart.id
        ORDER BY start_time, end_time, day_of_week
      LOOP
        v_time_key := r_day_config.start_time::text || '|' || r_day_config.end_time::text;

        IF v_time_groups_map ? v_time_key THEN
          v_days_array := ARRAY(
            SELECT jsonb_array_elements_text(v_time_groups_map->v_time_key->'days')::integer
          );
          v_days_array := array_append(v_days_array, r_day_config.day_of_week);

          v_time_groups_map := jsonb_set(
            v_time_groups_map,
            ARRAY[v_time_key, 'days'],
            to_jsonb(v_days_array)
          );
        ELSE
          v_time_groups_map := jsonb_set(
            v_time_groups_map,
            ARRAY[v_time_key],
            jsonb_build_object(
              'days', to_jsonb(ARRAY[r_day_config.day_of_week]),
              'start_time', to_jsonb(r_day_config.start_time::text),
              'end_time', to_jsonb(r_day_config.end_time::text)
            )
          );
        END IF;
      END LOOP;

      FOR v_time_key IN SELECT jsonb_object_keys(v_time_groups_map)
      LOOP
        INSERT INTO daypart_time_groups (
          daypart_definition_id,
          days_of_week,
          start_time,
          end_time
        ) VALUES (
          r_daypart.id,
          ARRAY(SELECT jsonb_array_elements_text(v_time_groups_map->v_time_key->'days')::integer),
          (v_time_groups_map->v_time_key->>'start_time')::time,
          (v_time_groups_map->v_time_key->>'end_time')::time
        );
      END LOOP;

      RAISE NOTICE '  Created % time groups from day configurations', jsonb_object_keys(v_time_groups_map);
    ELSE
      IF r_daypart.default_days IS NOT NULL AND array_length(r_daypart.default_days, 1) > 0 THEN
        INSERT INTO daypart_time_groups (
          daypart_definition_id,
          days_of_week,
          start_time,
          end_time
        ) VALUES (
          r_daypart.id,
          r_daypart.default_days,
          r_daypart.default_start_time,
          r_daypart.default_end_time
        );

        RAISE NOTICE '  Created default time group';
      ELSE
        RAISE NOTICE '  No default days configured, skipping';
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration complete!';
END $$;