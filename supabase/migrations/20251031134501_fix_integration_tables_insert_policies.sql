/*
  # Fix RLS policies for integration tables

  1. Changes
    - Add INSERT, UPDATE, DELETE policies for integration_products
    - Add INSERT, UPDATE, DELETE policies for integration_modifiers
    - Add INSERT, UPDATE, DELETE policies for integration_discounts
    
  2. Security
    - Allow public access for demo purposes (matches existing SELECT policies)
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert integration products" ON integration_products;
DROP POLICY IF EXISTS "Anyone can update integration products" ON integration_products;
DROP POLICY IF EXISTS "Anyone can delete integration products" ON integration_products;

DROP POLICY IF EXISTS "Anyone can insert integration modifiers" ON integration_modifiers;
DROP POLICY IF EXISTS "Anyone can update integration modifiers" ON integration_modifiers;
DROP POLICY IF EXISTS "Anyone can delete integration modifiers" ON integration_modifiers;

DROP POLICY IF EXISTS "Anyone can insert integration discounts" ON integration_discounts;
DROP POLICY IF EXISTS "Anyone can update integration discounts" ON integration_discounts;
DROP POLICY IF EXISTS "Anyone can delete integration discounts" ON integration_discounts;

-- Integration Products
CREATE POLICY "Anyone can insert integration products"
  ON integration_products FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration products"
  ON integration_products FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete integration products"
  ON integration_products FOR DELETE
  TO public
  USING (true);

-- Integration Modifiers
CREATE POLICY "Anyone can insert integration modifiers"
  ON integration_modifiers FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration modifiers"
  ON integration_modifiers FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete integration modifiers"
  ON integration_modifiers FOR DELETE
  TO public
  USING (true);

-- Integration Discounts
CREATE POLICY "Anyone can insert integration discounts"
  ON integration_discounts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration discounts"
  ON integration_discounts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete integration discounts"
  ON integration_discounts FOR DELETE
  TO public
  USING (true);