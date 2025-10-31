/*
  # Fix Product Publications RLS Policies

  1. Changes
    - Update RLS policies to allow anonymous access for demo purposes
    - Allow anyone to insert, update, and delete product publications
    - Match the pattern used in other tables for demo access

  2. Security Notes
    - These are permissive policies for demo/development
    - In production, these should be restricted based on user roles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view product publications" ON product_publications;
DROP POLICY IF EXISTS "Authenticated users can insert product publications" ON product_publications;
DROP POLICY IF EXISTS "Authenticated users can update product publications" ON product_publications;
DROP POLICY IF EXISTS "Authenticated users can delete product publications" ON product_publications;

-- Create new permissive policies for demo
CREATE POLICY "Anyone can view product publications"
  ON product_publications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert product publications"
  ON product_publications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update product publications"
  ON product_publications FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete product publications"
  ON product_publications FOR DELETE
  USING (true);
