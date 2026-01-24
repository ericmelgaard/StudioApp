/*
  # Remove Power Save Daypart Definition

  1. Overview
    - Removes the incorrectly added power_save daypart definition
    - Power save functionality remains in its own dedicated section (store_operation_hours_schedules table)
    - Power save already uses daypart-like scheduling patterns without being a daypart itself

  2. Changes
    - Delete power_save entry from daypart_definitions table
    - No impact on existing power save schedules in store_operation_hours_schedules

  3. Notes
    - Power save functionality is separate from dayparts
    - Both systems use similar scheduling patterns (via ScheduleGroupForm)
    - This restores the correct separation of concerns
*/

-- Remove the power_save daypart definition
DELETE FROM daypart_definitions 
WHERE daypart_name = 'power_save' 
  AND concept_id IS NULL 
  AND store_id IS NULL;
