/*
  # Allow Public Asset Uploads

  ## Summary
  Updates asset_library RLS policies to allow unauthenticated users to upload assets
  in the demo environment. This aligns with the public demo mode.

  ## Changes
    - Drop authenticated-only INSERT policy
    - Add new policy allowing anyone to insert assets
    - Maintain existing update/delete policies for authenticated users
*/

-- Drop the authenticated-only insert policy
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON asset_library;

-- Allow anyone (including unauthenticated users) to insert assets
CREATE POLICY "Anyone can upload assets"
  ON asset_library FOR INSERT
  WITH CHECK (true);
