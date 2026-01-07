/*
  # Fix User Store Access Foreign Key

  1. Changes
    - Drop the existing foreign key constraint that references auth.users
    - Add a new foreign key constraint that references user_profiles
    - This allows the demo system to work without actual auth users
  
  2. Security
    - No changes to RLS policies
*/

-- Drop the existing foreign key constraint
ALTER TABLE user_store_access
DROP CONSTRAINT IF EXISTS user_store_access_user_id_fkey;

-- Add new foreign key to user_profiles instead
ALTER TABLE user_store_access
ADD CONSTRAINT user_store_access_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;
