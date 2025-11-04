/*
  # Add UPDATE policies to integration tables

  1. Changes
    - Add UPDATE policies for integration_products
    - Add UPDATE policies for integration_modifiers  
    - Add UPDATE policies for integration_discounts
    
  2. Security
    - Allow public to update integration data (needed for upsert operations)
*/

CREATE POLICY "Anyone can update integration products"
  ON integration_products FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration modifiers"
  ON integration_modifiers FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can update integration discounts"
  ON integration_discounts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
