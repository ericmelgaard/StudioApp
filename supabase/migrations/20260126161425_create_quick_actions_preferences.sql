/*
  # Create Quick Actions Preferences

  1. New Tables
    - `quick_actions_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `store_id` (integer, foreign key to stores) - preferences per store
      - `visible_actions` (jsonb) - array of visible action IDs in order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `quick_actions_preferences` table
    - Add policy for authenticated users to manage their own preferences
  
  3. Notes
    - Each user can customize which quick action cards they see per store
    - The visible_actions array defines both visibility and order
    - Default actions: devices, groups, activity, products, signage, smart_labels, webview_kiosks
*/

CREATE TABLE IF NOT EXISTS quick_actions_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id integer REFERENCES stores(id) ON DELETE CASCADE,
  visible_actions jsonb DEFAULT '["devices", "groups", "activity", "products", "signage", "smart_labels", "webview_kiosks"]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, store_id)
);

ALTER TABLE quick_actions_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view own quick actions preferences"
  ON quick_actions_preferences FOR SELECT
  USING (true);

-- Users can insert their own preferences
CREATE POLICY "Users can create own quick actions preferences"
  ON quick_actions_preferences FOR INSERT
  WITH CHECK (true);

-- Users can update their own preferences
CREATE POLICY "Users can update own quick actions preferences"
  ON quick_actions_preferences FOR UPDATE
  USING (true);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own quick actions preferences"
  ON quick_actions_preferences FOR DELETE
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quick_actions_preferences_user_store 
  ON quick_actions_preferences(user_id, store_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_quick_actions_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_quick_actions_preferences_updated_at_trigger ON quick_actions_preferences;
CREATE TRIGGER update_quick_actions_preferences_updated_at_trigger
  BEFORE UPDATE ON quick_actions_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_actions_preferences_updated_at();

COMMENT ON TABLE quick_actions_preferences IS 'User preferences for visible and ordered quick action cards in operator dashboard';
COMMENT ON COLUMN quick_actions_preferences.visible_actions IS 'Ordered array of visible quick action IDs: devices, groups, activity, products, signage, smart_labels, webview_kiosks';
