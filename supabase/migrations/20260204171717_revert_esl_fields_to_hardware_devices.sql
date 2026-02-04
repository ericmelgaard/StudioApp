/*
  # Revert ESL Fields to Hardware Devices

  This migration moves ESL runtime data back to hardware_devices where it belongs.
  
  ## Relationship Model
  - **hardware_devices** = Physical device catalog with runtime status (can be swapped)
  - **media_players** = Logical assignment (e.g., "ESL-001 at Store X") that references hardware
  
  When a hardware device is swapped, the new device brings its own battery_status, 
  signal_strength, etc. The media_player just points to whichever physical device is assigned.
  
  ## Changes
  1. Add ESL runtime fields back to hardware_devices
  2. Migrate data from media_players back to hardware_devices
  3. Remove ESL fields from media_players (keep only media_player-specific fields)
  4. Update UI queries to properly join hardware_devices data
*/

-- Add ESL runtime fields back to hardware_devices
ALTER TABLE hardware_devices
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS mac_address text,
ADD COLUMN IF NOT EXISTS firmware_version text,
ADD COLUMN IF NOT EXISTS battery_status text,
ADD COLUMN IF NOT EXISTS signal_strength text,
ADD COLUMN IF NOT EXISTS label_type text,
ADD COLUMN IF NOT EXISTS network_status boolean,
ADD COLUMN IF NOT EXISTS template_name text,
ADD COLUMN IF NOT EXISTS product_id text,
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS last_response_time timestamptz,
ADD COLUMN IF NOT EXISTS sync_status text;

-- Create index on serial_number for lookups
CREATE INDEX IF NOT EXISTS idx_hardware_devices_serial_number ON hardware_devices(serial_number);

-- Migrate ESL data back from media_players to hardware_devices
UPDATE hardware_devices hd
SET 
  serial_number = COALESCE(hd.serial_number, mp.serial_number),
  mac_address = COALESCE(hd.mac_address, mp.mac_address),
  firmware_version = COALESCE(hd.firmware_version, mp.firmware_version),
  battery_status = COALESCE(hd.battery_status, mp.battery_status),
  signal_strength = COALESCE(hd.signal_strength, mp.signal_strength),
  label_type = COALESCE(hd.label_type, mp.label_type),
  network_status = COALESCE(hd.network_status, mp.network_status),
  template_name = COALESCE(hd.template_name, mp.template_name),
  product_id = COALESCE(hd.product_id, mp.product_id),
  product_name = COALESCE(hd.product_name, mp.product_name),
  last_response_time = COALESCE(hd.last_response_time, mp.last_response_time),
  sync_status = COALESCE(hd.sync_status, mp.sync_status)
FROM media_players mp
WHERE mp.hardware_device_id = hd.id
  AND mp.player_type = 'label';

-- Remove ESL runtime fields from media_players
ALTER TABLE media_players
DROP COLUMN IF EXISTS serial_number,
DROP COLUMN IF EXISTS battery_status,
DROP COLUMN IF EXISTS signal_strength,
DROP COLUMN IF EXISTS label_type,
DROP COLUMN IF EXISTS network_status,
DROP COLUMN IF EXISTS template_name,
DROP COLUMN IF EXISTS product_id,
DROP COLUMN IF EXISTS product_name,
DROP COLUMN IF EXISTS last_response_time,
DROP COLUMN IF EXISTS sync_status;

-- Keep mac_address and firmware_version on media_players for signage players
-- (these might be set directly for non-ESL devices)

-- Update table comments
COMMENT ON TABLE hardware_devices IS 'Physical hardware device catalog with runtime status. Devices can be swapped between media_players.';
COMMENT ON TABLE media_players IS 'Logical media player assignments (e.g., "ESL-001 at Store X"). References physical hardware_devices.';
