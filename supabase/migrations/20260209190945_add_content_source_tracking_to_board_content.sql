/*
  # Add Content Source Tracking to Board Content

  ## Overview
  Enhances the board_content table to track where content originated from,
  supporting multiple content sources: asset library, shared library, direct uploads,
  and external design tools.

  ## Schema Updates

    ### `shared_content_library`
      - Add `collection_id` reference to organize shared content into collections

    ### `board_content`
      - Add `content_source` field to track origin
      - Add `source_reference` field for external tool references  
      - Add `shared_content_id` reference for shared library content
      - Add `source_metadata` jsonb field for additional source data

  ## Content Sources
    - `asset_library` - From organization's asset library
    - `shared_library` - From shared/curated content library
    - `upload` - Directly uploaded by user
    - `design_tool` - Imported from external design tool (Canva, etc.)
    - `template` - From template library
*/

-- Add collection_id to shared_content_library if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shared_content_library' AND column_name = 'collection_id'
  ) THEN
    ALTER TABLE shared_content_library 
      ADD COLUMN collection_id uuid REFERENCES content_collections(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_shared_content_collection ON shared_content_library(collection_id);
  END IF;
END $$;

-- Add content source tracking fields to board_content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'board_content' AND column_name = 'content_source'
  ) THEN
    ALTER TABLE board_content ADD COLUMN content_source text DEFAULT 'asset_library';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'board_content' AND column_name = 'shared_content_id'
  ) THEN
    ALTER TABLE board_content 
      ADD COLUMN shared_content_id uuid REFERENCES shared_content_library(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'board_content' AND column_name = 'source_reference'
  ) THEN
    ALTER TABLE board_content ADD COLUMN source_reference text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'board_content' AND column_name = 'source_metadata'
  ) THEN
    ALTER TABLE board_content ADD COLUMN source_metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add constraint to content_source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'board_content_content_source_check'
  ) THEN
    ALTER TABLE board_content ADD CONSTRAINT board_content_content_source_check
      CHECK (content_source IN ('asset_library', 'shared_library', 'upload', 'design_tool', 'template'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for board_content new fields
CREATE INDEX IF NOT EXISTS idx_board_content_source ON board_content(content_source);
CREATE INDEX IF NOT EXISTS idx_board_content_shared ON board_content(shared_content_id);

-- Function to increment usage count when shared content is added to a board
CREATE OR REPLACE FUNCTION increment_shared_content_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shared_content_id IS NOT NULL THEN
    UPDATE shared_content_library
    SET
      usage_count = usage_count + 1,
      last_used_at = now()
    WHERE id = NEW.shared_content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS board_content_shared_usage ON board_content;
CREATE TRIGGER board_content_shared_usage
  AFTER INSERT ON board_content
  FOR EACH ROW
  EXECUTE FUNCTION increment_shared_content_usage();
