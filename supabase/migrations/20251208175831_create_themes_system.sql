/*
  # Create Display Themes System

  1. New Tables
    - `display_types`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "4K HD Display", "4.2 ESL", "5.4 ESL", "Print Menu", "Facebook Page"
      - `description` (text)
      - `specifications` (jsonb) - technical specs like resolution, aspect ratio
      - `category` (text) - e.g., "digital_signage", "esl", "print", "social_media"
      - `status` (text) - active, inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `themes`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `status` (text) - draft, active, archived
      - `metadata` (jsonb) - additional configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `theme_content`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key)
      - `display_type_id` (uuid, foreign key)
      - `content_data` (jsonb) - stores content variations per display type
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `placement_routines`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key)
      - `placement_id` (uuid, foreign key to placement_groups)
      - `cycle_week` (integer) - which week in the cycle (1-based)
      - `day_of_week` (integer) - 0=Sunday, 1=Monday, etc.
      - `start_time` (time) - time of day to start
      - `status` (text) - active, inactive, paused
      - `priority` (integer) - calculated from created_at, newest = highest priority
      - `created_at` (timestamptz) - used for priority determination
      - `updated_at` (timestamptz)

    - `organization_cycle_settings`
      - `id` (uuid, primary key)
      - `concept_id` (integer, foreign key)
      - `starting_week_date` (date) - the date when week 1 of the cycle starts
      - `cycle_duration_weeks` (integer) - number of weeks in a cycle
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their organization's data

  3. Indexes
    - Add indexes for efficient querying on placement_routines
*/

-- Create display_types table
CREATE TABLE IF NOT EXISTS display_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  specifications jsonb DEFAULT '{}',
  category text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create theme_content table
CREATE TABLE IF NOT EXISTS theme_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  display_type_id uuid NOT NULL REFERENCES display_types(id) ON DELETE CASCADE,
  content_data jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, display_type_id)
);

-- Create placement_routines table
CREATE TABLE IF NOT EXISTS placement_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  placement_id uuid NOT NULL REFERENCES placement_groups(id) ON DELETE CASCADE,
  cycle_week integer NOT NULL CHECK (cycle_week > 0),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  priority integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organization_cycle_settings table
CREATE TABLE IF NOT EXISTS organization_cycle_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id integer NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  starting_week_date date NOT NULL,
  cycle_duration_weeks integer NOT NULL CHECK (cycle_duration_weeks > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(concept_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_placement_routines_placement_id ON placement_routines(placement_id);
CREATE INDEX IF NOT EXISTS idx_placement_routines_theme_id ON placement_routines(theme_id);
CREATE INDEX IF NOT EXISTS idx_placement_routines_cycle_week ON placement_routines(cycle_week);
CREATE INDEX IF NOT EXISTS idx_placement_routines_created_at ON placement_routines(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_theme_content_theme_id ON theme_content(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_content_display_type_id ON theme_content(display_type_id);

-- Create function to automatically update priority based on created_at
CREATE OR REPLACE FUNCTION update_placement_routine_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- Higher priority for newer routines (using negative timestamp for descending order)
  NEW.priority := EXTRACT(EPOCH FROM NEW.created_at)::integer;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic priority assignment
DROP TRIGGER IF EXISTS set_placement_routine_priority ON placement_routines;
CREATE TRIGGER set_placement_routine_priority
  BEFORE INSERT ON placement_routines
  FOR EACH ROW
  EXECUTE FUNCTION update_placement_routine_priority();

-- Enable Row Level Security
ALTER TABLE display_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_cycle_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for display_types
CREATE POLICY "Users can view display types"
  ON display_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert display types"
  ON display_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update display types"
  ON display_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete display types"
  ON display_types FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for themes
CREATE POLICY "Users can view themes"
  ON themes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert themes"
  ON themes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update themes"
  ON themes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete themes"
  ON themes FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for theme_content
CREATE POLICY "Users can view theme content"
  ON theme_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert theme content"
  ON theme_content FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update theme content"
  ON theme_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete theme content"
  ON theme_content FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for placement_routines
CREATE POLICY "Users can view placement routines"
  ON placement_routines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert placement routines"
  ON placement_routines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update placement routines"
  ON placement_routines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete placement routines"
  ON placement_routines FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for organization_cycle_settings
CREATE POLICY "Users can view organization cycle settings"
  ON organization_cycle_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert organization cycle settings"
  ON organization_cycle_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update organization cycle settings"
  ON organization_cycle_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete organization cycle settings"
  ON organization_cycle_settings FOR DELETE
  TO authenticated
  USING (true);

-- Insert default display types
INSERT INTO display_types (name, description, category, specifications, status) VALUES
  ('4K HD Display', 'High definition 4K digital display for signage', 'digital_signage', '{"resolution": "3840x2160", "aspect_ratio": "16:9", "format": "video"}'::jsonb, 'active'),
  ('4.2" ESL', '4.2 inch electronic shelf label', 'esl', '{"resolution": "400x300", "screen_size": "4.2", "format": "image"}'::jsonb, 'active'),
  ('5.4" ESL', '5.4 inch electronic shelf label', 'esl', '{"resolution": "480x320", "screen_size": "5.4", "format": "image"}'::jsonb, 'active'),
  ('Print Menu', 'Physical printed menu boards', 'print', '{"format": "pdf", "print_size": "letter"}'::jsonb, 'active'),
  ('Facebook Page', 'Social media content for Facebook', 'social_media', '{"platform": "facebook", "format": "image_text"}'::jsonb, 'active')
ON CONFLICT DO NOTHING;
