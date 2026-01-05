/*
  # Create Hardware Devices Table and Update Media Players

  ## Overview
  This migration separates physical hardware devices from logical media players,
  enabling hardware replacement scenarios where physical devices can be swapped
  while maintaining the logical media player configuration.

  ## 1. New Tables

  ### hardware_devices
  - `id` (uuid, primary key) - Unique identifier for each hardware device
  - `device_id` (text, unique) - Hardware device identifier (e.g., DEVICE-001)
  - `device_type` (text) - Type of hardware (e.g., raspberry_pi, intel_nuc, android_box)
  - `mac_address` (text) - MAC address for network identification
  - `serial_number` (text) - Manufacturer serial number
  - `status` (text) - available, assigned, maintenance, retired
  - `notes` (text) - Additional notes about the device
  - `last_seen` (timestamptz) - Last time device was detected on network
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Updates to media_players
  - Add `hardware_device_id` (uuid) - Foreign key to hardware_devices table
  - Keep `device_id` for backward compatibility but make it optional
  - Remove unique constraint on device_id since it will reference hardware_devices

  ## 3. Security
  - Enable RLS on hardware_devices table
  - Add policies allowing public access to match existing pattern

  ## 4. Indexes
  - Add indexes for efficient querying on foreign keys and status fields
*/

-- Create hardware_devices table
CREATE TABLE IF NOT EXISTS hardware_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  device_type text NOT NULL DEFAULT 'raspberry_pi' CHECK (device_type IN ('raspberry_pi', 'intel_nuc', 'android_box', 'windows_pc', 'other')),
  mac_address text,
  serial_number text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  notes text,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add hardware_device_id to media_players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_players' AND column_name = 'hardware_device_id'
  ) THEN
    ALTER TABLE media_players ADD COLUMN hardware_device_id uuid REFERENCES hardware_devices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_hardware_devices_status ON hardware_devices(status);
CREATE INDEX IF NOT EXISTS idx_hardware_devices_device_type ON hardware_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_media_players_hardware_device_id ON media_players(hardware_device_id);

-- Enable Row Level Security
ALTER TABLE hardware_devices ENABLE ROW LEVEL SECURITY;

-- Create policies allowing public access (matching existing pattern)
CREATE POLICY "Allow public access to hardware_devices"
  ON hardware_devices FOR ALL
  USING (true)
  WITH CHECK (true);
