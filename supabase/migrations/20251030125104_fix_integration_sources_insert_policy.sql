/*
  # Fix Integration Sources Insert Policy

  1. Changes
    - Add INSERT policy for integration_sources to allow anyone to create sources
    - Add INSERT policies for integration products, modifiers, and discounts
  
  2. Security Note
    - For demo purposes, allowing anyone to insert integration data
    - In production, restrict to specific service accounts or admin roles
*/

CREATE POLICY "Anyone can insert integration sources"
  ON integration_sources FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert integration products"
  ON integration_products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert integration modifiers"
  ON integration_modifiers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert integration discounts"
  ON integration_discounts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration sources"
  ON integration_sources FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration products"
  ON integration_products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration modifiers"
  ON integration_modifiers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration discounts"
  ON integration_discounts FOR UPDATE
  USING (true)
  WITH CHECK (true);