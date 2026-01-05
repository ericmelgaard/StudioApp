/*
  # Seed Hardware Devices and Display Types

  ## Overview
  This migration seeds initial data for hardware devices and display types to support
  the device and display management system.

  ## 1. Hardware Devices
  - Create 50 fake hardware devices (DEVICE-001 through DEVICE-050)
  - Distribute across different device types
  - Set realistic MAC addresses and serial numbers
  - Assign various statuses for testing

  ## 2. Display Types
  - Create display types for: Snacks, Treats, Promo, Drinks
  - Create Vertical display types (1-10)
  - Create Horizontal display types (1-10)
  - Set appropriate resolutions (1920x1080 for horizontal, 1080x1920 for vertical)
*/

-- Seed 50 hardware devices (only if they don't exist)
INSERT INTO hardware_devices (device_id, device_type, mac_address, serial_number, status, notes)
SELECT * FROM (VALUES
  ('DEVICE-001', 'raspberry_pi', '00:1B:44:11:3A:B7', 'RPI-SN-001', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-002', 'raspberry_pi', '00:1B:44:11:3A:B8', 'RPI-SN-002', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-003', 'raspberry_pi', '00:1B:44:11:3A:B9', 'RPI-SN-003', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-004', 'raspberry_pi', '00:1B:44:11:3A:BA', 'RPI-SN-004', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-005', 'raspberry_pi', '00:1B:44:11:3A:BB', 'RPI-SN-005', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-006', 'intel_nuc', '00:1C:42:00:00:01', 'NUC-SN-001', 'available', 'Intel NUC 11'),
  ('DEVICE-007', 'intel_nuc', '00:1C:42:00:00:02', 'NUC-SN-002', 'available', 'Intel NUC 11'),
  ('DEVICE-008', 'intel_nuc', '00:1C:42:00:00:03', 'NUC-SN-003', 'available', 'Intel NUC 11'),
  ('DEVICE-009', 'intel_nuc', '00:1C:42:00:00:04', 'NUC-SN-004', 'available', 'Intel NUC 11'),
  ('DEVICE-010', 'intel_nuc', '00:1C:42:00:00:05', 'NUC-SN-005', 'available', 'Intel NUC 11'),
  ('DEVICE-011', 'android_box', '00:1A:7D:DA:71:01', 'AND-SN-001', 'available', 'Android TV Box'),
  ('DEVICE-012', 'android_box', '00:1A:7D:DA:71:02', 'AND-SN-002', 'available', 'Android TV Box'),
  ('DEVICE-013', 'android_box', '00:1A:7D:DA:71:03', 'AND-SN-003', 'available', 'Android TV Box'),
  ('DEVICE-014', 'android_box', '00:1A:7D:DA:71:04', 'AND-SN-004', 'available', 'Android TV Box'),
  ('DEVICE-015', 'android_box', '00:1A:7D:DA:71:05', 'AND-SN-005', 'available', 'Android TV Box'),
  ('DEVICE-016', 'raspberry_pi', '00:1B:44:11:3A:BC', 'RPI-SN-006', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-017', 'raspberry_pi', '00:1B:44:11:3A:BD', 'RPI-SN-007', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-018', 'raspberry_pi', '00:1B:44:11:3A:BE', 'RPI-SN-008', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-019', 'raspberry_pi', '00:1B:44:11:3A:BF', 'RPI-SN-009', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-020', 'raspberry_pi', '00:1B:44:11:3A:C0', 'RPI-SN-010', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-021', 'intel_nuc', '00:1C:42:00:00:06', 'NUC-SN-006', 'available', 'Intel NUC 11'),
  ('DEVICE-022', 'intel_nuc', '00:1C:42:00:00:07', 'NUC-SN-007', 'available', 'Intel NUC 11'),
  ('DEVICE-023', 'intel_nuc', '00:1C:42:00:00:08', 'NUC-SN-008', 'available', 'Intel NUC 11'),
  ('DEVICE-024', 'intel_nuc', '00:1C:42:00:00:09', 'NUC-SN-009', 'available', 'Intel NUC 11'),
  ('DEVICE-025', 'intel_nuc', '00:1C:42:00:00:0A', 'NUC-SN-010', 'available', 'Intel NUC 11'),
  ('DEVICE-026', 'android_box', '00:1A:7D:DA:71:06', 'AND-SN-006', 'available', 'Android TV Box'),
  ('DEVICE-027', 'android_box', '00:1A:7D:DA:71:07', 'AND-SN-007', 'available', 'Android TV Box'),
  ('DEVICE-028', 'android_box', '00:1A:7D:DA:71:08', 'AND-SN-008', 'available', 'Android TV Box'),
  ('DEVICE-029', 'android_box', '00:1A:7D:DA:71:09', 'AND-SN-009', 'available', 'Android TV Box'),
  ('DEVICE-030', 'android_box', '00:1A:7D:DA:71:0A', 'AND-SN-010', 'available', 'Android TV Box'),
  ('DEVICE-031', 'windows_pc', '00:50:56:C0:00:01', 'WIN-SN-001', 'available', 'Windows Mini PC'),
  ('DEVICE-032', 'windows_pc', '00:50:56:C0:00:02', 'WIN-SN-002', 'available', 'Windows Mini PC'),
  ('DEVICE-033', 'windows_pc', '00:50:56:C0:00:03', 'WIN-SN-003', 'available', 'Windows Mini PC'),
  ('DEVICE-034', 'windows_pc', '00:50:56:C0:00:04', 'WIN-SN-004', 'available', 'Windows Mini PC'),
  ('DEVICE-035', 'windows_pc', '00:50:56:C0:00:05', 'WIN-SN-005', 'available', 'Windows Mini PC'),
  ('DEVICE-036', 'raspberry_pi', '00:1B:44:11:3A:C1', 'RPI-SN-011', 'maintenance', 'Raspberry Pi 4 - Needs firmware update'),
  ('DEVICE-037', 'raspberry_pi', '00:1B:44:11:3A:C2', 'RPI-SN-012', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-038', 'raspberry_pi', '00:1B:44:11:3A:C3', 'RPI-SN-013', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-039', 'raspberry_pi', '00:1B:44:11:3A:C4', 'RPI-SN-014', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-040', 'raspberry_pi', '00:1B:44:11:3A:C5', 'RPI-SN-015', 'available', 'Raspberry Pi 4 Model B'),
  ('DEVICE-041', 'intel_nuc', '00:1C:42:00:00:0B', 'NUC-SN-011', 'available', 'Intel NUC 11'),
  ('DEVICE-042', 'intel_nuc', '00:1C:42:00:00:0C', 'NUC-SN-012', 'available', 'Intel NUC 11'),
  ('DEVICE-043', 'intel_nuc', '00:1C:42:00:00:0D', 'NUC-SN-013', 'available', 'Intel NUC 11'),
  ('DEVICE-044', 'intel_nuc', '00:1C:42:00:00:0E', 'NUC-SN-014', 'retired', 'Intel NUC - Hardware failure'),
  ('DEVICE-045', 'intel_nuc', '00:1C:42:00:00:0F', 'NUC-SN-015', 'available', 'Intel NUC 11'),
  ('DEVICE-046', 'android_box', '00:1A:7D:DA:71:0B', 'AND-SN-011', 'available', 'Android TV Box'),
  ('DEVICE-047', 'android_box', '00:1A:7D:DA:71:0C', 'AND-SN-012', 'available', 'Android TV Box'),
  ('DEVICE-048', 'android_box', '00:1A:7D:DA:71:0D', 'AND-SN-013', 'available', 'Android TV Box'),
  ('DEVICE-049', 'android_box', '00:1A:7D:DA:71:0E', 'AND-SN-014', 'available', 'Android TV Box'),
  ('DEVICE-050', 'android_box', '00:1A:7D:DA:71:0F', 'AND-SN-015', 'available', 'Android TV Box')
) AS v(device_id, device_type, mac_address, serial_number, status, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM hardware_devices WHERE hardware_devices.device_id = v.device_id
);

-- Seed display types for specialty categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM display_types WHERE name = 'Snacks') THEN
    INSERT INTO display_types (name, description, category, specifications, status) 
    VALUES ('Snacks', 'Display type for snack items and quick bites', 'signage', '{"resolution": "1920x1080", "orientation": "horizontal", "contentType": "snacks"}', 'active');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM display_types WHERE name = 'Treats') THEN
    INSERT INTO display_types (name, description, category, specifications, status) 
    VALUES ('Treats', 'Display type for desserts and sweet treats', 'signage', '{"resolution": "1920x1080", "orientation": "horizontal", "contentType": "treats"}', 'active');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM display_types WHERE name = 'Promo') THEN
    INSERT INTO display_types (name, description, category, specifications, status) 
    VALUES ('Promo', 'Display type for promotional content and special offers', 'signage', '{"resolution": "1920x1080", "orientation": "horizontal", "contentType": "promo"}', 'active');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM display_types WHERE name = 'Drinks') THEN
    INSERT INTO display_types (name, description, category, specifications, status) 
    VALUES ('Drinks', 'Display type for beverage menu items', 'signage', '{"resolution": "1920x1080", "orientation": "horizontal", "contentType": "drinks"}', 'active');
  END IF;
END $$;

-- Seed vertical display types (1-10)
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    IF NOT EXISTS (SELECT 1 FROM display_types WHERE name = 'Vertical ' || i) THEN
      INSERT INTO display_types (name, description, category, specifications, status)
      VALUES (
        'Vertical ' || i,
        'Vertical display position ' || i,
        'vertical',
        json_build_object('resolution', '1080x1920', 'orientation', 'vertical', 'position', i)::jsonb,
        'active'
      );
    END IF;
  END LOOP;
END $$;

-- Seed horizontal display types (1-10)
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    IF NOT EXISTS (SELECT 1 FROM display_types WHERE name = 'Horizontal ' || i) THEN
      INSERT INTO display_types (name, description, category, specifications, status)
      VALUES (
        'Horizontal ' || i,
        'Horizontal display position ' || i,
        'horizontal',
        json_build_object('resolution', '1920x1080', 'orientation', 'horizontal', 'position', i)::jsonb,
        'active'
      );
    END IF;
  END LOOP;
END $$;
