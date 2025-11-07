/*
  # Add Location Scope Columns to user_profiles

  1. Schema Changes
    - Add location_scope columns to user_profiles table
      - `concept_id` (bigint, nullable) - restricts user to specific concept
      - `company_id` (bigint, nullable) - restricts user to specific company  
      - `store_id` (bigint, nullable) - restricts user to specific store
*/

-- Add location_scope columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS concept_id BIGINT REFERENCES concepts(id),
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS store_id BIGINT REFERENCES stores(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_concept_id ON user_profiles(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_store_id ON user_profiles(store_id);