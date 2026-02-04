/*
  # Add Usage Type to Hardware Devices and Seed ESL Devices

  1. Changes
    - Add `usage_type` field to hardware_devices table ('signage' or 'label')
    - Add index on usage_type for efficient filtering
    - Seed 50 4.2" ESL devices to Eurest Demo store with random serial numbers
  
  2. Notes
    - Usage type indicates whether the hardware is for digital signage or electronic shelf labels
    - ESL devices are 4.2" electronic shelf label hardware
    - All seeded devices will have activated status
*/

-- Add usage_type to hardware_devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_devices' AND column_name = 'usage_type'
  ) THEN
    ALTER TABLE hardware_devices 
    ADD COLUMN usage_type text DEFAULT 'signage' NOT NULL CHECK (usage_type IN ('signage', 'label'));
  END IF;
END $$;

-- Create index for usage_type filtering
CREATE INDEX IF NOT EXISTS idx_hardware_devices_usage_type ON hardware_devices(usage_type);

-- Update existing devices to signage (default)
UPDATE hardware_devices SET usage_type = 'signage' WHERE usage_type IS NULL;

-- Add comment explaining usage_type
COMMENT ON COLUMN hardware_devices.usage_type IS 'Type of display this hardware is used for: signage (digital signage) or label (electronic shelf labels)';

-- Seed 50 4.2" ESL devices for Eurest Demo store
DO $$
DECLARE
  v_store_id integer;
  v_device_id text;
  v_serial_number text;
  v_mac_address text;
  v_activation_id text;
  i integer;
BEGIN
  -- Get Eurest Demo store ID
  SELECT id INTO v_store_id 
  FROM stores 
  WHERE name = 'Eurest Demo Store' 
  LIMIT 1;

  IF v_store_id IS NOT NULL THEN
    -- Create 50 ESL devices
    FOR i IN 1..50 LOOP
      -- Generate random serial number (format: ESL-XXXX-XXXX where X is alphanumeric)
      v_serial_number := 'ESL-' || 
        upper(substring(md5(random()::text) from 1 for 4)) || '-' || 
        upper(substring(md5(random()::text) from 1 for 4));
      
      -- Generate device ID
      v_device_id := 'esl-device-' || lpad(i::text, 3, '0') || '-' || lower(substring(md5(random()::text) from 1 for 6));
      
      -- Generate MAC address (format: AA:BB:CC:DD:EE:FF)
      v_mac_address := upper(
        substring(md5(random()::text) from 1 for 2) || ':' ||
        substring(md5(random()::text) from 1 for 2) || ':' ||
        substring(md5(random()::text) from 1 for 2) || ':' ||
        substring(md5(random()::text) from 1 for 2) || ':' ||
        substring(md5(random()::text) from 1 for 2) || ':' ||
        substring(md5(random()::text) from 1 for 2)
      );
      
      -- Generate activation ID
      LOOP
        v_activation_id := 'HW-' || 
          upper(substring(md5(random()::text) from 1 for 8)) || '-' || 
          upper(substring(md5(random()::text) from 1 for 4));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM hardware_devices WHERE activation_id = v_activation_id);
      END LOOP;
      
      -- Insert the ESL device
      INSERT INTO hardware_devices (
        device_id,
        device_type,
        usage_type,
        mac_address,
        serial_number,
        status,
        activation_id,
        client_version,
        activated_at,
        notes
      ) VALUES (
        v_device_id,
        'esl_42inch',
        'label',
        v_mac_address,
        v_serial_number,
        'activated',
        v_activation_id,
        '4.6.5',
        now(),
        '4.2" Electronic Shelf Label - Eurest Demo Store'
      );
    END LOOP;
    
    RAISE NOTICE 'Successfully seeded 50 ESL devices for Eurest Demo Store';
  ELSE
    RAISE NOTICE 'Eurest Demo Store not found - skipping ESL device seeding';
  END IF;
END $$;

-- Update device_type check constraint to include ESL types
ALTER TABLE hardware_devices DROP CONSTRAINT IF EXISTS hardware_devices_device_type_check;
ALTER TABLE hardware_devices 
ADD CONSTRAINT hardware_devices_device_type_check 
CHECK (device_type IN ('raspberry_pi', 'intel_nuc', 'android_box', 'windows_pc', 'esl_42inch', 'esl_29inch', 'esl_75inch', 'other'));
