/*
  # Allow Anonymous Category Management

  1. Changes
    - Update INSERT policy on product_categories to allow anonymous users
    - Update UPDATE policy on product_categories to allow anonymous users
    - Update DELETE policy on product_categories to allow anonymous users
    - Update INSERT policy on product_category_assignments to allow anonymous users

  2. Security Note
    - This allows demo/development mode where users can manage categories without auth
    - In production, you may want to restrict this to authenticated users only
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON product_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON product_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON product_categories;
DROP POLICY IF EXISTS "Authenticated users can assign categories" ON product_category_assignments;

-- Create new permissive policies
CREATE POLICY "Anyone can insert categories"
  ON product_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update categories"
  ON product_categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete categories"
  ON product_categories FOR DELETE
  USING (true);

CREATE POLICY "Anyone can assign categories"
  ON product_category_assignments FOR INSERT
  WITH CHECK (true);
