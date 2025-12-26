/*
  # Add Money Format Settings to Templates

  1. Changes
    - Add `money_format_settings` JSONB column to `product_attribute_templates` table
    - Store configuration for how prices and monetary values should be displayed
  
  2. Money Format Settings Schema
    - `show_currency_symbol` (boolean): Show or hide dollar sign
    - `currency_symbol` (string): The currency symbol to use (default: '$')
    - `symbol_position` (string): 'before' or 'after' the amount
    - `symbol_style` (string): 'normal' or 'superscript'
    - `decimal_places` (number): 0, 2, or custom number
    - `show_cents` (boolean): Display cents/decimal portion
    - `thousands_separator` (string): ',', ' ', or 'none'
    - `decimal_separator` (string): '.' or ','
    - `rounding_mode` (string): 'round', 'floor', 'ceil'
  
  3. Notes
    - Uses JSONB for flexibility
    - Default values will be set for existing templates
*/

-- Add money_format_settings column to product_attribute_templates
ALTER TABLE product_attribute_templates
ADD COLUMN IF NOT EXISTS money_format_settings JSONB DEFAULT '{
  "show_currency_symbol": true,
  "currency_symbol": "$",
  "symbol_position": "before",
  "symbol_style": "normal",
  "decimal_places": 2,
  "show_cents": true,
  "thousands_separator": ",",
  "decimal_separator": ".",
  "rounding_mode": "round"
}'::jsonb;

-- Update existing templates with default money format settings if they don't have any
UPDATE product_attribute_templates
SET money_format_settings = '{
  "show_currency_symbol": true,
  "currency_symbol": "$",
  "symbol_position": "before",
  "symbol_style": "normal",
  "decimal_places": 2,
  "show_cents": true,
  "thousands_separator": ",",
  "decimal_separator": ".",
  "rounding_mode": "round"
}'::jsonb
WHERE money_format_settings IS NULL;