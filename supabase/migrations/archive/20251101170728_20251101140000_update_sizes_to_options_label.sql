/*
  # Update Sizes Label to Options

  1. Changes
    - Update available_attributes table to change "Sizes" label to "Options"
    - This is a display label change only, the field name remains "sizes" for compatibility
*/

-- Update the label for sizes to Options
UPDATE available_attributes
SET label = 'Options'
WHERE name = 'sizes';
