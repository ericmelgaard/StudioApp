/*
  # Create Resource Management System

  1. New Tables
    - `icon_packs`
      - `id` (uuid, primary key)
      - `name` (text) - Pack name (e.g., "Nutritional Icons v1", "Call-to-Action Set A")
      - `description` (text, nullable) - Pack description
      - `type` (text) - Type of icons: 'nutritional', 'cta', 'general'
      - `is_active` (boolean) - Whether this pack is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `icons`
      - `id` (uuid, primary key)
      - `icon_pack_id` (uuid, foreign key to icon_packs)
      - `name` (text) - Icon identifier/name
      - `label` (text) - Human-readable label
      - `image_url` (text) - URL to the icon image
      - `metadata` (jsonb, nullable) - Additional metadata
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `icon_mappings`
      - `id` (uuid, primary key)
      - `integration_source_id` (uuid, foreign key to integration_sources)
      - `integration_field` (text) - Field name from POS (e.g., "icons", "dietary_flags")
      - `integration_value` (text) - Value from POS that maps to icon
      - `icon_id` (uuid, foreign key to icons)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `product_images`
      - `id` (uuid, primary key)
      - `name` (text) - Image name/identifier
      - `url` (text) - Image URL
      - `file_size` (integer, nullable) - File size in bytes
      - `width` (integer, nullable) - Image width
      - `height` (integer, nullable) - Image height
      - `tags` (text[], nullable) - Searchable tags
      - `uploaded_by` (uuid, nullable) - User who uploaded
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can read all resources
    - Only authenticated users can manage resources
*/

-- Icon Packs Table
CREATE TABLE IF NOT EXISTS icon_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('nutritional', 'cta', 'general')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE icon_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view icon packs"
  ON icon_packs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert icon packs"
  ON icon_packs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update icon packs"
  ON icon_packs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete icon packs"
  ON icon_packs FOR DELETE
  TO authenticated
  USING (true);

-- Icons Table
CREATE TABLE IF NOT EXISTS icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_pack_id uuid NOT NULL REFERENCES icon_packs(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  image_url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icons_pack_id ON icons(icon_pack_id);
CREATE INDEX IF NOT EXISTS idx_icons_sort_order ON icons(icon_pack_id, sort_order);

ALTER TABLE icons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view icons"
  ON icons FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert icons"
  ON icons FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update icons"
  ON icons FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete icons"
  ON icons FOR DELETE
  TO authenticated
  USING (true);

-- Icon Mappings Table
CREATE TABLE IF NOT EXISTS icon_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_source_id uuid NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  integration_field text NOT NULL,
  integration_value text NOT NULL,
  icon_id uuid NOT NULL REFERENCES icons(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(integration_source_id, integration_field, integration_value)
);

CREATE INDEX IF NOT EXISTS idx_icon_mappings_source ON icon_mappings(integration_source_id);
CREATE INDEX IF NOT EXISTS idx_icon_mappings_icon ON icon_mappings(icon_id);

ALTER TABLE icon_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view icon mappings"
  ON icon_mappings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert icon mappings"
  ON icon_mappings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update icon mappings"
  ON icon_mappings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete icon mappings"
  ON icon_mappings FOR DELETE
  TO authenticated
  USING (true);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  file_size integer,
  width integer,
  height integer,
  tags text[] DEFAULT ARRAY[]::text[],
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_tags ON product_images USING GIN(tags);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert product images"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product images"
  ON product_images FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product images"
  ON product_images FOR DELETE
  TO authenticated
  USING (true);
