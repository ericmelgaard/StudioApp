/*
  # Create user view preferences table

  ## Overview
  This migration creates a table to store user-specific view preferences for the product list,
  including column visibility, order, widths, sort state, filter state, and display density.

  ## New Tables
  
  ### `user_view_preferences`
  Stores personalized view settings for each user to persist their product list customizations.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the preference record
  - `user_id` (uuid) - Reference to the user (from auth.users)
  - `view_name` (text) - Name identifier for the view (e.g., 'product_list', 'integration_catalog')
  - `column_config` (jsonb) - Column visibility, order, and widths configuration
  - `sort_config` (jsonb) - Active sort state (column, direction, multi-sort order)
  - `filter_config` (jsonb) - Active filter state
  - `density` (text) - Row density setting: 'compact', 'comfortable', 'spacious'
  - `is_default` (boolean) - Whether this is the user's default view for this page
  - `created_at` (timestamptz) - When the preference was created
  - `updated_at` (timestamptz) - When the preference was last updated

  ## Security
  - Enable RLS on `user_view_preferences` table
  - Add policy for users to read their own preferences
  - Add policy for users to create their own preferences
  - Add policy for users to update their own preferences
  - Add policy for users to delete their own preferences

  ## Indexes
  - Composite index on `user_id` and `view_name` for fast lookups
  - Index on `user_id` for user-specific queries

  ## Notes
  - Users can have multiple saved views per page (named presets)
  - Only one view per page can be marked as default
  - The `column_config` JSONB stores: { columns: [{ key, visible, width, order, pinned }] }
  - The `sort_config` JSONB stores: { sorts: [{ column, direction, priority }] }
  - The `filter_config` JSONB stores active filters by column key
*/

-- Create user_view_preferences table
CREATE TABLE IF NOT EXISTS user_view_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  view_name text NOT NULL DEFAULT 'product_list',
  column_config jsonb DEFAULT '{"columns": []}'::jsonb,
  sort_config jsonb DEFAULT '{"sorts": []}'::jsonb,
  filter_config jsonb DEFAULT '{}'::jsonb,
  density text DEFAULT 'comfortable',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_view_preferences_density_check 
    CHECK (density IN ('compact', 'comfortable', 'spacious')),
  CONSTRAINT user_view_preferences_unique_user_view 
    UNIQUE (user_id, view_name, is_default)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_view_preferences_user_id 
  ON user_view_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_view_preferences_user_view 
  ON user_view_preferences(user_id, view_name);

-- Enable Row Level Security
ALTER TABLE user_view_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can read own view preferences"
  ON user_view_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own preferences
CREATE POLICY "Users can create own view preferences"
  ON user_view_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own view preferences"
  ON user_view_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own view preferences"
  ON user_view_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_view_preferences_updated_at ON user_view_preferences;
CREATE TRIGGER update_user_view_preferences_updated_at
  BEFORE UPDATE ON user_view_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();