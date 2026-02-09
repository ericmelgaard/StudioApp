/*
  # Create Board Content System for Theme Builder

  This migration creates the content management system for theme boards, allowing
  administrators to add and configure various content types (images, videos, templates)
  to display boards with full scheduling and playback controls.

  1. New Tables
    - `board_content`
      - Stores individual content items assigned to theme boards
      - Supports different content types (asset, template, custom)
      - Includes scheduling options (dates, times, days of week)
      - Manages playback settings (duration, transition effects)
      - Maintains display order within the board

  2. Content Types Supported
    - `asset` - Simple image or video from asset library
    - `template` - Configurable template with custom settings
    - `custom` - Advanced custom content (future use)

  3. Scheduling Features
    - Optional start/end date range
    - Optional time of day range
    - Days of week selection (empty = all days)
    - Order/position management

  4. Playback Settings
    - Duration in seconds (0 = infinite loop)
    - Transition effects between content
    - Auto-advance configuration

  5. Security
    - Enable RLS on board_content table
    - Allow public read access for content display
    - Restrict write access to authenticated users
*/

-- Create board_content table
CREATE TABLE IF NOT EXISTS board_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES theme_boards(id) ON DELETE CASCADE,
  
  -- Content identification
  content_type text NOT NULL DEFAULT 'asset',
  asset_id uuid REFERENCES asset_library(id) ON DELETE CASCADE,
  template_id uuid,
  
  -- Display order
  order_position integer NOT NULL DEFAULT 1,
  
  -- Playback settings
  duration_seconds integer NOT NULL DEFAULT 10,
  transition_effect text NOT NULL DEFAULT 'fade',
  
  -- Scheduling
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  days_of_week integer[] DEFAULT '{}',
  
  -- Template/custom configuration
  config_data jsonb DEFAULT '{}',
  
  -- Metadata
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_content_type CHECK (content_type IN ('asset', 'template', 'custom')),
  CONSTRAINT valid_duration CHECK (duration_seconds >= 0),
  CONSTRAINT valid_transition CHECK (transition_effect IN ('none', 'fade', 'slide', 'zoom', 'wipe')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'draft', 'archived'))
);

-- Create index for faster board content queries
CREATE INDEX IF NOT EXISTS idx_board_content_board_id ON board_content(board_id);
CREATE INDEX IF NOT EXISTS idx_board_content_order ON board_content(board_id, order_position);
CREATE INDEX IF NOT EXISTS idx_board_content_asset_id ON board_content(asset_id);

-- Enable Row Level Security
ALTER TABLE board_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access for displaying content
CREATE POLICY "Allow public read access to board content"
  ON board_content
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert board content
CREATE POLICY "Allow authenticated users to insert board content"
  ON board_content
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update board content
CREATE POLICY "Allow authenticated users to update board content"
  ON board_content
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete board content
CREATE POLICY "Allow authenticated users to delete board content"
  ON board_content
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_board_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS board_content_updated_at ON board_content;
CREATE TRIGGER board_content_updated_at
  BEFORE UPDATE ON board_content
  FOR EACH ROW
  EXECUTE FUNCTION update_board_content_updated_at();
