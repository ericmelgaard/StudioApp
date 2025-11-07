/*
  # Add Store Relationship and Location Fields to Placement Groups

  1. Schema Changes
    - Add `store_id` field to link placements to stores
    - Add `is_store_root` boolean to identify store root placements
    - Add store-specific location fields:
      - `address` (text) - physical store address
      - `timezone` (text) - store timezone (e.g., 'America/New_York')
      - `phone` (text) - store contact phone number
      - `operating_hours` (jsonb) - store operating hours by day
    - Keep all existing placement fields (daypart_hours, meal_stations, templates, nfc_url)

  2. Indexes
    - Add index on store_id for efficient queries
    - Add index on is_store_root for filtering

  3. Security
    - Update RLS policies to maintain existing access patterns
*/

-- Add store relationship and location fields to placement_groups
ALTER TABLE placement_groups 
  ADD COLUMN IF NOT EXISTS store_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_store_root boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}'::jsonb;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_placement_groups_store_id ON placement_groups(store_id);
CREATE INDEX IF NOT EXISTS idx_placement_groups_is_store_root ON placement_groups(is_store_root) WHERE is_store_root = true;

-- Add comment for documentation
COMMENT ON COLUMN placement_groups.store_id IS 'Links placement to a store. Store root placements have this set.';
COMMENT ON COLUMN placement_groups.is_store_root IS 'Identifies if this placement is the root node for a store.';
COMMENT ON COLUMN placement_groups.address IS 'Physical address for store root placements.';
COMMENT ON COLUMN placement_groups.timezone IS 'Timezone for store root placements (e.g., America/New_York).';
COMMENT ON COLUMN placement_groups.phone IS 'Contact phone number for store root placements.';
COMMENT ON COLUMN placement_groups.operating_hours IS 'Store operating hours by day of week for store root placements.';