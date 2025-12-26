/*
  # Add Calorie Format Settings to Templates

  1. Changes
    - Add `calorie_format_settings` JSONB column to `product_attribute_templates` table
    - Store configuration for how calorie values should be displayed
  
  2. Calorie Format Settings Schema
    - `show_unit` (boolean): Show or hide calorie unit
    - `unit_label` (string): The unit label to use (e.g., 'Cal', 'cal', 'Cals', 'cals', 'kcal')
    - `unit_position` (string): 'before' or 'after' the amount
    - `custom_unit` (string): Custom unit label if using custom option
    - `thousands_separator` (string): ',', ' ', or 'none'
    - `show_decimals` (boolean): Display decimal portion
    - `decimal_places` (number): Number of decimal places (typically 0 for calories)
    - `rounding_mode` (string): 'round', 'floor', 'ceil'
  
  3. Notes
    - Uses JSONB for flexibility
    - Default values will be set for existing templates
*/

-- Add calorie_format_settings column to product_attribute_templates
ALTER TABLE product_attribute_templates
ADD COLUMN IF NOT EXISTS calorie_format_settings JSONB DEFAULT '{
  "show_unit": true,
  "unit_label": "Cal",
  "unit_position": "after",
  "custom_unit": "",
  "thousands_separator": ",",
  "show_decimals": false,
  "decimal_places": 0,
  "rounding_mode": "round"
}'::jsonb;

-- Update existing templates with default calorie format settings if they don't have any
UPDATE product_attribute_templates
SET calorie_format_settings = '{
  "show_unit": true,
  "unit_label": "Cal",
  "unit_position": "after",
  "custom_unit": "",
  "thousands_separator": ",",
  "show_decimals": false,
  "decimal_places": 0,
  "rounding_mode": "round"
}'::jsonb
WHERE calorie_format_settings IS NULL;