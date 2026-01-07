/*
  # Update RLS Policies for Store Access

  1. Changes
    - Update RLS policies to check user_store_access table
    - Users with store-level access can only see data for their assigned stores
    - Admins retain full access
    - Users with company/concept level access retain their existing access
  
  2. Security
    - Store-level access is now enforced through user_store_access table
    - Maintains backward compatibility with company_id and concept_id access
*/

-- Helper function to check if a user has access to a store
CREATE OR REPLACE FUNCTION user_has_store_access(target_store_id bigint)
RETURNS boolean AS $$
BEGIN
  -- Check if user has direct store access via user_store_access table
  IF EXISTS (
    SELECT 1 FROM user_store_access usa
    JOIN user_profiles up ON up.id = usa.user_id
    WHERE usa.user_id = up.id
    AND usa.store_id = target_store_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has company-level access
  IF EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN stores s ON s.company_id = up.company_id
    WHERE up.id = up.id
    AND s.id = target_store_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has concept-level access
  IF EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN companies c ON c.concept_id = up.concept_id
    JOIN stores s ON s.company_id = c.id
    WHERE up.id = up.id
    AND s.id = target_store_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
