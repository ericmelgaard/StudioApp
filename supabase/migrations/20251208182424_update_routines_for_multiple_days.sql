/*
  # Update Routines to Support Multiple Days

  1. Changes
    - Change day_of_week from integer to integer array
    - Allows routines to run on multiple days like smart home routines
    
  2. Migration
    - Add new column days_of_week as integer array
    - Copy existing day_of_week data to array format
    - Drop old column
    - Rename new column
*/

ALTER TABLE placement_routines 
ADD COLUMN days_of_week integer[] DEFAULT ARRAY[]::integer[];

UPDATE placement_routines 
SET days_of_week = ARRAY[day_of_week];

ALTER TABLE placement_routines 
DROP COLUMN day_of_week;
