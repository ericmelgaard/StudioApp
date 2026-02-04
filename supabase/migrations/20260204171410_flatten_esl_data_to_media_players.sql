/*
  # Flatten ESL Data to Media Players

  This migration moves ESL-specific runtime data from the nested `hardware_devices` table
  directly onto `media_players` where it belongs. This makes the data structure simpler
  and easier for the UI to consume.

  ## Changes

  1. **Add ESL Fields to media_players**
     - `serial_number` - Device serial number (unique identifier)
     - `battery_status` - Battery level (GOOD, LOW, CRITICAL, etc.)
     - `signal_strength` - WiFi/network signal (EXCELLENT, GOOD, FAIR, POOR)
     - `label_type` - ESL hardware model (e.g., NEWTON_4_2_4C_NFC)
     - `network_status` - Whether device is connected to network
     - `template_name` - Current display template being used
     - `product_id` - Product currently displayed on the label
     - `product_name` - Product name currently displayed
     - `last_response_time` - Last time device communicated with server
     - `sync_status` - Sync state (SUCCESS, PENDING, FAILED, etc.)

  2. **Migrate Existing Data**
     - Copy all ESL data from hardware_devices to media_players for existing labels
     - Sync mac_address field if different

  3. **Clean up hardware_devices**
     - Remove ESL runtime fields, keep only catalog fields:
       - device_id, device_type, notes, status
       - activation_id, activated_at, client_version, last_seen
       - usage_type

  ## Notes
  - hardware_devices becomes a pure catalog/template table
  - media_players holds all instance-specific runtime data
  - This matches how signage players already work
*/

-- Add ESL fields to media_players
ALTER TABLE media_players 
ADD COLUMN IF NOT EXISTS serial_number text,
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
CREATE INDEX IF NOT EXISTS idx_media_players_serial_number ON media_players(serial_number);

-- Migrate existing ESL data from hardware_devices to media_players
UPDATE media_players mp
SET 
  serial_number = hd.serial_number,
  battery_status = hd.battery_status,
  signal_strength = hd.signal_strength,
  label_type = hd.label_type,
  network_status = hd.network_status,
  template_name = hd.template_name,
  product_id = hd.product_id,
  product_name = hd.product_name,
  last_response_time = hd.last_response_time,
  sync_status = hd.sync_status,
  mac_address = COALESCE(mp.mac_address, hd.mac_address),
  firmware_version = COALESCE(mp.firmware_version, hd.firmware_version)
FROM hardware_devices hd
WHERE mp.hardware_device_id = hd.id
  AND mp.player_type = 'label';

-- Remove ESL runtime fields from hardware_devices (keep only catalog fields)
ALTER TABLE hardware_devices
DROP COLUMN IF EXISTS serial_number,
DROP COLUMN IF EXISTS battery_status,
DROP COLUMN IF EXISTS signal_strength,
DROP COLUMN IF EXISTS label_type,
DROP COLUMN IF EXISTS network_status,
DROP COLUMN IF EXISTS template_name,
DROP COLUMN IF EXISTS product_id,
DROP COLUMN IF EXISTS product_name,
DROP COLUMN IF EXISTS last_response_time,
DROP COLUMN IF EXISTS sync_status,
DROP COLUMN IF EXISTS firmware_version,
DROP COLUMN IF EXISTS mac_address;

-- Add a comment to hardware_devices to clarify its purpose
COMMENT ON TABLE hardware_devices IS 'Catalog of available hardware devices (templates). Instance-specific data lives on media_players.';
