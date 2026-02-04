/*
  # Add ESL Device Attributes to Hardware Devices

  1. Changes
    - Add ESL-specific columns to hardware_devices table to support electronic shelf label data
    - New columns include battery status, signal strength, label type, firmware version, 
      network status, template name, product info, sync status, and last response time
    - All new columns are nullable to maintain backward compatibility with non-ESL devices

  2. New Columns
    - `battery_status` (text) - Battery condition: 'GOOD', 'LOW', 'CRITICAL', etc.
    - `signal_strength` (text) - Signal quality: 'EXCELLENT', 'GOOD', 'POOR', etc.
    - `label_type` (text) - Device model identifier (e.g., 'NEWTON_4_2_4C_NFC')
    - `firmware_version` (text) - Current firmware version number
    - `network_status` (boolean) - Connectivity status (true/false)
    - `template_name` (text) - XSL template name used for display
    - `product_id` (text) - Currently displayed product ID (informational)
    - `product_name` (text) - Currently displayed product name (informational)
    - `last_response_time` (timestamptz) - Last successful API sync timestamp
    - `sync_status` (text) - Last sync result: 'SUCCESS', '-', or null

  3. Notes
    - All columns are optional to support both ESL and traditional media player hardware
    - No RLS policy changes needed as these are additional attributes on existing table
*/

-- Add ESL-specific columns to hardware_devices table
DO $$
BEGIN
  -- Battery status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'battery_status'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN battery_status text;
  END IF;

  -- Signal strength
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'signal_strength'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN signal_strength text;
  END IF;

  -- Label type (device model)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'label_type'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN label_type text;
  END IF;

  -- Firmware version
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'firmware_version'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN firmware_version text;
  END IF;

  -- Network status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'network_status'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN network_status boolean;
  END IF;

  -- Template name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN template_name text;
  END IF;

  -- Product ID (informational)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN product_id text;
  END IF;

  -- Product name (informational)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'product_name'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN product_name text;
  END IF;

  -- Last response time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'last_response_time'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN last_response_time timestamptz;
  END IF;

  -- Sync status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE hardware_devices ADD COLUMN sync_status text;
  END IF;
END $$;