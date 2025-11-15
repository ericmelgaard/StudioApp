/*
  # Create Available Attributes Table

  1. New Tables
    - `available_attributes`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Internal identifier
      - `label` (text) - Display label
      - `type` (text) - Data type: text, richtext, number, boolean, image, sizes
      - `default_required` (boolean) - Whether this attribute is required by default
      - `description` (text) - Attribute description
      - `category` (text) - Category for grouping (will be replaced by sections)
      - `is_system` (boolean) - System-defined attribute
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `available_attributes` table
    - Add policies for authenticated users
*/

-- Create available_attributes table
CREATE TABLE IF NOT EXISTS available_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'richtext', 'number', 'boolean', 'image', 'sizes')),
  default_required boolean DEFAULT false,
  description text,
  category text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE available_attributes ENABLE ROW LEVEL SECURITY;

-- Policies for available_attributes
CREATE POLICY "Users can view available attributes"
  ON available_attributes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create custom attributes"
  ON available_attributes FOR INSERT
  TO authenticated
  WITH CHECK (is_system = false);

CREATE POLICY "Users can update custom attributes"
  ON available_attributes FOR UPDATE
  TO authenticated
  USING (is_system = false)
  WITH CHECK (is_system = false);

CREATE POLICY "Users can delete custom attributes"
  ON available_attributes FOR DELETE
  TO authenticated
  USING (is_system = false);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_available_attributes_category ON available_attributes(category);
CREATE INDEX IF NOT EXISTS idx_available_attributes_type ON available_attributes(type);
