/*
  # Fix RLS Policies for Product Categories Links
  
  1. Changes
    - Drop existing authenticated-only policies
    - Add new policies that allow public access for admin operations
    - This is needed because the application doesn't have auth implemented yet
  
  2. Security Notes
    - These policies allow public access - should be restricted when auth is added
    - Current setup is suitable for internal admin tools
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read category links" ON product_categories_links;
DROP POLICY IF EXISTS "Authenticated users can insert category links" ON product_categories_links;
DROP POLICY IF EXISTS "Authenticated users can update category links" ON product_categories_links;
DROP POLICY IF EXISTS "Authenticated users can delete category links" ON product_categories_links;

-- Create new policies that allow public access
CREATE POLICY "Allow public read access to category links"
  ON product_categories_links
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to category links"
  ON product_categories_links
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to category links"
  ON product_categories_links
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to category links"
  ON product_categories_links
  FOR DELETE
  TO public
  USING (true);
