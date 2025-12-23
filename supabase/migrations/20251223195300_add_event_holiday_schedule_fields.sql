/*
  # Add Event/Holiday Schedule Fields

  1. Changes to Schedule Tables
    - Adds `schedule_type` field to differentiate regular schedules from event/holiday schedules
    - Adds `event_name` field for naming holidays/events
    - Adds `event_date` field for single-day events
    - Adds `recurrence_type` field for different recurrence patterns
    - Adds `recurrence_config` field (JSONB) for storing recurrence details
    - Adds `priority_level` field for schedule resolution (higher = takes precedence)

  2. Tables Updated
    - store_operation_hours_schedules
    - daypart_schedules
    - placement_daypart_overrides

  3. Recurrence Types Supported
    - 'none': One-time event on specific date
    - 'annual_date': Recurs annually on same date (e.g., Dec 25)
    - 'monthly_date': Recurs monthly on same day (e.g., 15th of each month)
    - 'annual_relative': Recurs annually on relative day (e.g., last Monday of May)
    - 'annual_date_range': Multi-week date range recurring annually

  4. Priority System
    - 100: Single-day events (highest priority, overrides everything)
    - 50: Date range events (overrides regular schedules)
    - 10: Regular schedules (default, lowest priority)

  5. Security
    - Maintains existing RLS policies (all tables inherit from parent)
    - No new policies needed as fields are added to existing tables
*/

-- Add event/holiday fields to store_operation_hours_schedules
ALTER TABLE store_operation_hours_schedules
  ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'regular' CHECK (schedule_type IN ('regular', 'event_holiday')),
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS recurrence_type text CHECK (recurrence_type IN ('none', 'annual_date', 'monthly_date', 'annual_relative', 'annual_date_range')),
  ADD COLUMN IF NOT EXISTS recurrence_config jsonb,
  ADD COLUMN IF NOT EXISTS priority_level integer DEFAULT 10 CHECK (priority_level >= 1 AND priority_level <= 100);

-- Add event/holiday fields to daypart_schedules
ALTER TABLE daypart_schedules
  ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'regular' CHECK (schedule_type IN ('regular', 'event_holiday')),
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS recurrence_type text CHECK (recurrence_type IN ('none', 'annual_date', 'monthly_date', 'annual_relative', 'annual_date_range')),
  ADD COLUMN IF NOT EXISTS recurrence_config jsonb,
  ADD COLUMN IF NOT EXISTS priority_level integer DEFAULT 10 CHECK (priority_level >= 1 AND priority_level <= 100);

-- Add event/holiday fields to placement_daypart_overrides
ALTER TABLE placement_daypart_overrides
  ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'regular' CHECK (schedule_type IN ('regular', 'event_holiday')),
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS recurrence_type text CHECK (recurrence_type IN ('none', 'annual_date', 'monthly_date', 'annual_relative', 'annual_date_range')),
  ADD COLUMN IF NOT EXISTS recurrence_config jsonb,
  ADD COLUMN IF NOT EXISTS priority_level integer DEFAULT 10 CHECK (priority_level >= 1 AND priority_level <= 100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_store_operation_hours_schedules_schedule_type
  ON store_operation_hours_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_store_operation_hours_schedules_priority
  ON store_operation_hours_schedules(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_store_operation_hours_schedules_event_date
  ON store_operation_hours_schedules(event_date) WHERE event_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daypart_schedules_schedule_type
  ON daypart_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_daypart_schedules_priority
  ON daypart_schedules(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_daypart_schedules_event_date
  ON daypart_schedules(event_date) WHERE event_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_placement_daypart_overrides_schedule_type
  ON placement_daypart_overrides(schedule_type);
CREATE INDEX IF NOT EXISTS idx_placement_daypart_overrides_priority
  ON placement_daypart_overrides(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_placement_daypart_overrides_event_date
  ON placement_daypart_overrides(event_date) WHERE event_date IS NOT NULL;

-- Update existing schedules to have default values
UPDATE store_operation_hours_schedules
SET schedule_type = 'regular', priority_level = 10
WHERE schedule_type IS NULL;

UPDATE daypart_schedules
SET schedule_type = 'regular', priority_level = 10
WHERE schedule_type IS NULL;

UPDATE placement_daypart_overrides
SET schedule_type = 'regular', priority_level = 10
WHERE schedule_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN store_operation_hours_schedules.schedule_type IS 'Type of schedule: regular for normal recurring schedules, event_holiday for special events/holidays';
COMMENT ON COLUMN store_operation_hours_schedules.priority_level IS 'Priority for schedule resolution: 100=single day events, 50=date range events, 10=regular schedules';
COMMENT ON COLUMN store_operation_hours_schedules.recurrence_config IS 'JSONB configuration for recurrence: {month, day_of_month, weekday, position, range_start_date, range_end_date}';
