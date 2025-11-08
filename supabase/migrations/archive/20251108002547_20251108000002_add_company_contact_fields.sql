/*
  # Add Contact and Address Fields to Companies Table

  1. Changes to `companies` table
    - Add `description` (text) - Long description of the company
    - Add `address` (text) - Street address
    - Add `city` (text) - City name
    - Add `state` (text) - State/province code
    - Add `zip_code` (text) - Postal/ZIP code
    - Add `phone` (text) - Contact phone number
    - Add `email` (text) - Contact email address

  2. Notes
    - All new fields are nullable (optional)
    - Address fields can be used for company headquarters or main office
*/

-- Add description field to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'description'
  ) THEN
    ALTER TABLE companies ADD COLUMN description text;
  END IF;
END $$;

-- Add address field to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'address'
  ) THEN
    ALTER TABLE companies ADD COLUMN address text;
  END IF;
END $$;

-- Add city field to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'city'
  ) THEN
    ALTER TABLE companies ADD COLUMN city text;
  END IF;
END $$;

-- Add state field to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'state'
  ) THEN
    ALTER TABLE companies ADD COLUMN state text;
  END IF;
END $$;

-- Add zip_code field to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE companies ADD COLUMN zip_code text;
  END IF;
END $$;

-- Add phone field to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'phone'
  ) THEN
    ALTER TABLE companies ADD COLUMN phone text;
  END IF;
END $$;

-- Add email field to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'email'
  ) THEN
    ALTER TABLE companies ADD COLUMN email text;
  END IF;
END $$;