/*
  # Remove Auth Constraint from user_profiles for Demo Users

  1. Changes
    - Drop the foreign key constraint to auth.users
    - This allows us to create demo users without Supabase Auth
*/

-- Drop the foreign key constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;