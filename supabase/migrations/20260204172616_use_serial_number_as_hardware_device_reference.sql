/*
  # Use Serial Number as Hardware Device Reference

  Changes the hardware device relationship to use serial_number as the natural key
  instead of internal UUIDs. This aligns with how ESL devices are actually identified.
  
  ## Changes
  1. Make serial_number unique and required on hardware_devices
  2. Change media_players.hardware_device_id from UUID FK to text field storing serial_number
  3. Migrate existing UUID references to serial_numbers
  4. Update foreign key to reference serial_number
  
  ## Benefits
  - Serial number is the actual physical device identifier
  - Simpler queries (no need for complex joins on UUIDs)
  - More intuitive for operators (they see/scan serial numbers, not UUIDs)
*/

-- Step 1: Make serial_number unique and not null on hardware_devices
UPDATE hardware_devices 
SET serial_number = device_id 
WHERE serial_number IS NULL;

ALTER TABLE hardware_devices
ALTER COLUMN serial_number SET NOT NULL,
ADD CONSTRAINT hardware_devices_serial_number_unique UNIQUE (serial_number);

-- Step 2: Add temporary column to media_players for migration
ALTER TABLE media_players
ADD COLUMN IF NOT EXISTS hardware_serial_number text;

-- Step 3: Migrate existing UUID references to serial_numbers
UPDATE media_players mp
SET hardware_serial_number = hd.serial_number
FROM hardware_devices hd
WHERE mp.hardware_device_id = hd.id;

-- Step 4: Drop old FK constraint and column
ALTER TABLE media_players
DROP CONSTRAINT IF EXISTS media_players_hardware_device_id_fkey,
DROP COLUMN hardware_device_id;

-- Step 5: Rename new column to hardware_device_id (now stores serial_number)
ALTER TABLE media_players
RENAME COLUMN hardware_serial_number TO hardware_device_id;

-- Step 6: Add new FK constraint referencing serial_number
ALTER TABLE media_players
ADD CONSTRAINT media_players_hardware_device_serial_fkey 
FOREIGN KEY (hardware_device_id) 
REFERENCES hardware_devices(serial_number)
ON DELETE SET NULL;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_media_players_hardware_serial 
ON media_players(hardware_device_id);

-- Update comments
COMMENT ON COLUMN media_players.hardware_device_id IS 'Serial number of the assigned hardware device (e.g., "10F1BD707B7B")';
COMMENT ON COLUMN hardware_devices.serial_number IS 'Unique serial number - primary identifier for ESL devices';
