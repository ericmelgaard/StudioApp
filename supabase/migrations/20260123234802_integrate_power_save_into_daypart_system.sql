/*
  # Integrate Power Save into Daypart System

  1. Overview
    - Adds power_save as a system-level daypart definition
    - Makes power_save visible and manageable through the daypart system UI
    - Maintains existing store_operation_hours_schedules table for data storage
    - Future migration will consolidate schedules into unified daypart_schedules table

  2. Changes
    - Create global power_save daypart definition
    - Power save schedules remain in store_operation_hours_schedules for now
    - Future phase will migrate data to unified structure

  3. Design
    - Power save is treated as a special daypart type for device power management
    - Can be configured at store level (existing) and potentially concept/global levels (future)
    - Integrates with existing display management for power control
*/

-- Create global power_save daypart definition
INSERT INTO daypart_definitions (
  id,
  daypart_name,
  display_label,
  description,
  color,
  icon,
  sort_order,
  is_active,
  concept_id,
  store_id,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'power_save',
  'Power Save',
  'Controls when devices enter power saving mode. Schedules defined here will automatically put displays into a low-power state during specified times.',
  'bg-slate-600 text-white border-slate-700',
  'PowerOff',
  999,
  true,
  NULL,
  NULL,
  now(),
  now()
)
ON CONFLICT (daypart_name) WHERE (concept_id IS NULL AND store_id IS NULL)
DO UPDATE SET
  display_label = EXCLUDED.display_label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  updated_at = now();
