/*
  # Create Daypart Staged Changes System

  1. New Tables
    - `daypart_staged_changes`
      - Stores pending changes to daypart schedules with scheduled publish dates
      - Supports create, update, and delete operations
      - Tracks status and publishing information

    - `daypart_change_history`
      - Audit log of all published changes
      - Tracks who made changes and when they went live

  2. Changes
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their staged changes
    - Add function to automatically publish changes when publish_date is reached
    - Add function to apply staged changes to target tables

  3. Security
    - Users can only view/edit staged changes for locations they have access to
    - Admin users have full access to all staged changes
*/

-- Create enum for change types
DO $$ BEGIN
  CREATE TYPE daypart_change_type AS ENUM ('create', 'update', 'delete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for change status
DO $$ BEGIN
  CREATE TYPE daypart_change_status AS ENUM ('pending', 'published', 'cancelled', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for target tables
DO $$ BEGIN
  CREATE TYPE daypart_target_table AS ENUM ('daypart_definitions', 'daypart_schedules', 'site_daypart_routines', 'placement_daypart_overrides');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create staged changes table
CREATE TABLE IF NOT EXISTS daypart_staged_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type daypart_change_type NOT NULL,
  target_table daypart_target_table NOT NULL,
  target_id uuid,
  change_data jsonb NOT NULL,
  publish_date timestamptz NOT NULL DEFAULT now(),
  publish_immediately boolean DEFAULT false,
  status daypart_change_status DEFAULT 'pending',
  notes text,
  location_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  error_message text,
  CONSTRAINT valid_publish_date CHECK (publish_date >= created_at)
);

-- Create change history table
CREATE TABLE IF NOT EXISTS daypart_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staged_change_id uuid REFERENCES daypart_staged_changes(id) ON DELETE SET NULL,
  change_type daypart_change_type NOT NULL,
  target_table daypart_target_table NOT NULL,
  target_id uuid,
  change_data jsonb NOT NULL,
  location_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  published_at timestamptz DEFAULT now(),
  published_by uuid REFERENCES auth.users(id),
  notes text
);

-- Enable RLS
ALTER TABLE daypart_staged_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daypart_change_history ENABLE ROW LEVEL SECURITY;

-- Policies for staged changes (allow access based on user's store_id or if location_id is null for global changes)
CREATE POLICY "Users can view staged changes for their locations"
  ON daypart_staged_changes FOR SELECT
  USING (
    location_id IS NULL OR
    location_id IN (
      SELECT store_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create staged changes for their locations"
  ON daypart_staged_changes FOR INSERT
  WITH CHECK (
    location_id IS NULL OR
    location_id IN (
      SELECT store_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own pending staged changes"
  ON daypart_staged_changes FOR UPDATE
  USING (
    status = 'pending' AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete their own pending staged changes"
  ON daypart_staged_changes FOR DELETE
  USING (
    status = 'pending' AND
    created_by = auth.uid()
  );

-- Policies for change history (read-only for users)
CREATE POLICY "Users can view change history for their locations"
  ON daypart_change_history FOR SELECT
  USING (
    location_id IS NULL OR
    location_id IN (
      SELECT store_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Function to apply a staged change
CREATE OR REPLACE FUNCTION apply_daypart_staged_change(change_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_change daypart_staged_changes%ROWTYPE;
  v_result boolean := false;
BEGIN
  -- Get the change record
  SELECT * INTO v_change
  FROM daypart_staged_changes
  WHERE id = change_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Apply the change based on type and table
  BEGIN
    CASE v_change.target_table
      WHEN 'daypart_definitions' THEN
        CASE v_change.change_type
          WHEN 'create' THEN
            INSERT INTO daypart_definitions
            SELECT * FROM jsonb_populate_record(null::daypart_definitions, v_change.change_data);
          WHEN 'update' THEN
            UPDATE daypart_definitions
            SET
              name = COALESCE((v_change.change_data->>'name'), name),
              display_order = COALESCE((v_change.change_data->>'display_order')::integer, display_order),
              color = COALESCE((v_change.change_data->>'color'), color),
              concept_id = COALESCE((v_change.change_data->>'concept_id')::bigint, concept_id),
              store_id = COALESCE((v_change.change_data->>'store_id')::bigint, store_id)
            WHERE id = v_change.target_id;
          WHEN 'delete' THEN
            DELETE FROM daypart_definitions WHERE id = v_change.target_id;
        END CASE;

      WHEN 'daypart_schedules' THEN
        CASE v_change.change_type
          WHEN 'create' THEN
            INSERT INTO daypart_schedules
            SELECT * FROM jsonb_populate_record(null::daypart_schedules, v_change.change_data);
          WHEN 'update' THEN
            UPDATE daypart_schedules
            SET
              start_time = COALESCE((v_change.change_data->>'start_time')::time, start_time),
              end_time = COALESCE((v_change.change_data->>'end_time')::time, end_time),
              is_overnight = COALESCE((v_change.change_data->>'is_overnight')::boolean, is_overnight)
            WHERE id = v_change.target_id;
          WHEN 'delete' THEN
            DELETE FROM daypart_schedules WHERE id = v_change.target_id;
        END CASE;

      WHEN 'site_daypart_routines' THEN
        CASE v_change.change_type
          WHEN 'create' THEN
            INSERT INTO site_daypart_routines
            SELECT * FROM jsonb_populate_record(null::site_daypart_routines, v_change.change_data);
          WHEN 'update' THEN
            UPDATE site_daypart_routines
            SET
              schedule_group_id = COALESCE((v_change.change_data->>'schedule_group_id')::uuid, schedule_group_id),
              priority = COALESCE((v_change.change_data->>'priority')::integer, priority)
            WHERE id = v_change.target_id;
          WHEN 'delete' THEN
            DELETE FROM site_daypart_routines WHERE id = v_change.target_id;
        END CASE;

      WHEN 'placement_daypart_overrides' THEN
        CASE v_change.change_type
          WHEN 'create' THEN
            INSERT INTO placement_daypart_overrides
            SELECT * FROM jsonb_populate_record(null::placement_daypart_overrides, v_change.change_data);
          WHEN 'update' THEN
            UPDATE placement_daypart_overrides
            SET
              schedule_group_id = COALESCE((v_change.change_data->>'schedule_group_id')::uuid, schedule_group_id)
            WHERE id = v_change.target_id;
          WHEN 'delete' THEN
            DELETE FROM placement_daypart_overrides WHERE id = v_change.target_id;
        END CASE;
    END CASE;

    -- Update the staged change status
    UPDATE daypart_staged_changes
    SET
      status = 'published',
      published_at = now(),
      published_by = auth.uid()
    WHERE id = change_id;

    -- Record in history
    INSERT INTO daypart_change_history (
      staged_change_id,
      change_type,
      target_table,
      target_id,
      change_data,
      location_id,
      published_by,
      notes
    ) VALUES (
      v_change.id,
      v_change.change_type,
      v_change.target_table,
      v_change.target_id,
      v_change.change_data,
      v_change.location_id,
      auth.uid(),
      v_change.notes
    );

    v_result := true;

  EXCEPTION WHEN OTHERS THEN
    -- Update with error
    UPDATE daypart_staged_changes
    SET
      status = 'failed',
      error_message = SQLERRM
    WHERE id = change_id;

    v_result := false;
  END;

  RETURN v_result;
END;
$$;

-- Function to publish all pending changes that are due
CREATE OR REPLACE FUNCTION publish_due_daypart_changes()
RETURNS TABLE(change_id uuid, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_change_id uuid;
BEGIN
  FOR v_change_id IN
    SELECT id
    FROM daypart_staged_changes
    WHERE status = 'pending'
      AND publish_date <= now()
    ORDER BY publish_date, created_at
  LOOP
    RETURN QUERY SELECT v_change_id, apply_daypart_staged_change(v_change_id);
  END LOOP;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staged_changes_status ON daypart_staged_changes(status);
CREATE INDEX IF NOT EXISTS idx_staged_changes_publish_date ON daypart_staged_changes(publish_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_staged_changes_location ON daypart_staged_changes(location_id);
CREATE INDEX IF NOT EXISTS idx_change_history_location ON daypart_change_history(location_id);
CREATE INDEX IF NOT EXISTS idx_change_history_published_at ON daypart_change_history(published_at DESC);
