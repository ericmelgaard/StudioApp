/*
  # Add Location and Contact Fields to Stores Table

  1. Changes to `stores` table
    - Add `latitude` (numeric) - Geographic latitude coordinate
    - Add `longitude` (numeric) - Geographic longitude coordinate
    - Add `address` (text) - Street address
    - Add `city` (text) - City name
    - Add `state` (text) - State/province code
    - Add `zip_code` (text) - Postal/ZIP code
    - Add `phone` (text) - Contact phone number

  2. Notes
    - All new fields are nullable (optional)
    - Latitude and longitude are used for map pin placement
    - Address fields enable geocoding and location-based features
*/

-- Add latitude field to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE stores ADD COLUMN latitude numeric(10, 7);
  END IF;
END $$;

-- Add longitude field to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE stores ADD COLUMN longitude numeric(10, 7);
  END IF;
END $$;

-- Add address field to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'address'
  ) THEN
    ALTER TABLE stores ADD COLUMN address text;
  END IF;
END $$;

-- Add city field to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'city'
  ) THEN
    ALTER TABLE stores ADD COLUMN city text;
  END IF;
END $$;

-- Add state field to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'state'
  ) THEN
    ALTER TABLE stores ADD COLUMN state text;
  END IF;
END $$;

-- Add zip_code field to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE stores ADD COLUMN zip_code text;
  END IF;
END $$;

-- Add phone field to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'phone'
  ) THEN
    ALTER TABLE stores ADD COLUMN phone text;
  END IF;
END $$;