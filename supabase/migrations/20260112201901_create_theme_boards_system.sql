/*
  # Create Theme Boards System

  1. Changes
    - Create `theme_boards` table to replace display_type_ids and daypart_ids arrays
    - Each board represents a unique combination of display type and daypart for a theme
    - Remove display_type_ids and daypart_ids columns from themes table
    - Update theme_content to reference theme_board_id instead of display_type_id

  2. New Tables
    - `theme_boards`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `display_type_id` (uuid, foreign key to display_types)
      - `daypart_id` (uuid, foreign key to daypart_definitions)
      - `layout_config` (jsonb) - stores layout configuration (default: full display)
      - `status` (text) - active, inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - UNIQUE constraint on (theme_id, display_type_id, daypart_id)

  3. Updates
    - Add theme_board_id to theme_content table
    - Remove display_type_ids and daypart_ids from themes table

  4. Security
    - Enable RLS on theme_boards
    - Add policies for public access (matching current theme policies)
*/

-- Create theme_boards table
CREATE TABLE IF NOT EXISTS theme_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  display_type_id uuid NOT NULL REFERENCES display_types(id) ON DELETE CASCADE,
  daypart_id uuid NOT NULL REFERENCES daypart_definitions(id) ON DELETE CASCADE,
  layout_config jsonb DEFAULT '{"type": "full_display", "width": "100%", "height": "100%"}'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, display_type_id, daypart_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_theme_boards_theme_id ON theme_boards(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_boards_display_type_id ON theme_boards(display_type_id);
CREATE INDEX IF NOT EXISTS idx_theme_boards_daypart_id ON theme_boards(daypart_id);

-- Add theme_board_id to theme_content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_content' AND column_name = 'theme_board_id'
  ) THEN
    ALTER TABLE theme_content ADD COLUMN theme_board_id uuid REFERENCES theme_boards(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on theme_board_id
CREATE INDEX IF NOT EXISTS idx_theme_content_theme_board_id ON theme_content(theme_board_id);

-- Remove old array columns from themes table
ALTER TABLE themes DROP COLUMN IF EXISTS display_type_ids;
ALTER TABLE themes DROP COLUMN IF EXISTS daypart_ids;

-- Enable Row Level Security
ALTER TABLE theme_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for theme_boards (public access to match existing theme policies)
CREATE POLICY "Allow public read access to theme boards"
  ON theme_boards FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to theme boards"
  ON theme_boards FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to theme boards"
  ON theme_boards FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to theme boards"
  ON theme_boards FOR DELETE
  TO public
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE theme_boards IS 'Stores unique board configurations for themes. Each board represents a unique combination of display type and daypart.';
COMMENT ON COLUMN theme_boards.layout_config IS 'JSON configuration for layout. Currently defaults to full display (100% width/height).';