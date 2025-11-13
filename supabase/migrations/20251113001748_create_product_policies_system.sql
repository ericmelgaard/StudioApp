/*
  # Create Product Policies System

  ## Overview
  This migration creates a comprehensive policy system to track and enforce product compliance rules.
  The initial policy enforces French translation requirements for product names.

  ## New Tables

  ### `product_policies`
  Defines reusable policy rules that can be applied to products.

  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the policy
  - `name` (text, unique) - Policy name (e.g., 'french_translation_required')
  - `display_name` (text) - Human-readable policy name
  - `description` (text) - Detailed description of what the policy checks
  - `policy_type` (text) - Type of policy: 'translation', 'content', 'quality', etc.
  - `severity` (text) - Severity level: 'info', 'warning', 'error'
  - `is_active` (boolean) - Whether the policy is currently being enforced
  - `config` (jsonb) - Policy-specific configuration
  - `created_at` (timestamptz) - When the policy was created
  - `updated_at` (timestamptz) - When the policy was last updated

  ### `product_policy_evaluations`
  Caches policy evaluation results for each product to avoid repeated checks.

  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the evaluation
  - `product_id` (uuid, foreign key) - References the product being evaluated
  - `policy_id` (uuid, foreign key) - References the policy being checked
  - `status` (text) - Evaluation result: 'compliant', 'warning', 'violation'
  - `violation_details` (jsonb) - Details about what failed and how to fix it
  - `evaluated_at` (timestamptz) - When the evaluation was performed
  - `created_at` (timestamptz) - When the evaluation record was created

  ## Schema Changes

  ### `products` table modifications
  - Add `policy_status` column (text) - Overall policy compliance: 'compliant', 'warning', 'violation'
  - Add `last_policy_check` column (timestamptz) - Timestamp of last policy evaluation

  ## Database Functions

  ### `evaluate_product_policies(product_id uuid)`
  Evaluates all active policies for a given product and updates the evaluation cache.

  ### `check_french_translation_policy(product_attributes jsonb)`
  Checks if the product has a French translation for the name field.

  ## Security
  - Enable Row Level Security on new tables
  - Add policies for authenticated users to read policy definitions
  - Add policies for authenticated users to read policy evaluations
  - Restrict policy creation/modification to admins (for now, allow all authenticated users)

  ## Indexes
  - Index on `product_id` in evaluations for fast product lookups
  - Index on `policy_id` in evaluations for fast policy lookups
  - Composite index on `product_id` and `status` for filtering
  - Index on `is_active` in policies for filtering active policies

  ## Notes
  - Policy evaluations are cached and only recalculated when products change
  - The system is designed to be extensible for additional policy types
  - Initial policy focuses on French translation requirements
*/

-- Create product_policies table
CREATE TABLE IF NOT EXISTS product_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  policy_type text NOT NULL DEFAULT 'quality',
  severity text NOT NULL DEFAULT 'warning',
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_policies_severity_check
    CHECK (severity IN ('info', 'warning', 'error'))
);

-- Create product_policy_evaluations table
CREATE TABLE IF NOT EXISTS product_policy_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'compliant',
  violation_details jsonb DEFAULT '{}'::jsonb,
  evaluated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT product_policy_evaluations_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT product_policy_evaluations_policy_id_fkey
    FOREIGN KEY (policy_id)
    REFERENCES product_policies(id)
    ON DELETE CASCADE,
  CONSTRAINT product_policy_evaluations_status_check
    CHECK (status IN ('compliant', 'warning', 'violation')),
  UNIQUE(product_id, policy_id)
);

-- Add policy columns to products table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'policy_status'
  ) THEN
    ALTER TABLE products ADD COLUMN policy_status text DEFAULT 'compliant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'last_policy_check'
  ) THEN
    ALTER TABLE products ADD COLUMN last_policy_check timestamptz;
  END IF;
END $$;

-- Add constraint to policy_status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'products' AND constraint_name = 'products_policy_status_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_policy_status_check
      CHECK (policy_status IN ('compliant', 'warning', 'violation'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_policy_evaluations_product_id
  ON product_policy_evaluations(product_id);

CREATE INDEX IF NOT EXISTS idx_product_policy_evaluations_policy_id
  ON product_policy_evaluations(policy_id);

CREATE INDEX IF NOT EXISTS idx_product_policy_evaluations_product_status
  ON product_policy_evaluations(product_id, status);

CREATE INDEX IF NOT EXISTS idx_product_policies_active
  ON product_policies(is_active);

CREATE INDEX IF NOT EXISTS idx_products_policy_status
  ON products(policy_status);

-- Enable Row Level Security
ALTER TABLE product_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_policy_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies for product_policies table
CREATE POLICY "Authenticated users can read product policies"
  ON product_policies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create product policies"
  ON product_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product policies"
  ON product_policies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product policies"
  ON product_policies
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for product_policy_evaluations table
CREATE POLICY "Authenticated users can read policy evaluations"
  ON product_policy_evaluations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create policy evaluations"
  ON product_policy_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update policy evaluations"
  ON product_policy_evaluations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete policy evaluations"
  ON product_policy_evaluations
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to check French translation policy
CREATE OR REPLACE FUNCTION check_french_translation_policy(product_attributes jsonb)
RETURNS jsonb AS $$
DECLARE
  fr_translations jsonb;
  fr_name text;
  result jsonb;
BEGIN
  -- Check for translations_fr_fr key
  fr_translations := product_attributes->'translations_fr_fr';

  -- If translations_fr_fr doesn't exist or is null
  IF fr_translations IS NULL THEN
    result := jsonb_build_object(
      'status', 'violation',
      'missing_fields', jsonb_build_array('translations_fr_fr.name'),
      'message', 'French translation for name is missing'
    );
    RETURN result;
  END IF;

  -- Check if name field exists in French translations
  fr_name := fr_translations->>'name';

  IF fr_name IS NULL OR fr_name = '' THEN
    result := jsonb_build_object(
      'status', 'violation',
      'missing_fields', jsonb_build_array('translations_fr_fr.name'),
      'message', 'French translation for name is empty or missing'
    );
    RETURN result;
  END IF;

  -- All checks passed
  result := jsonb_build_object(
    'status', 'compliant',
    'message', 'French translation for name exists'
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to evaluate all policies for a product
CREATE OR REPLACE FUNCTION evaluate_product_policies(p_product_id uuid)
RETURNS void AS $$
DECLARE
  product_record RECORD;
  policy_record RECORD;
  evaluation_result jsonb;
  eval_status text;
  worst_status text := 'compliant';
BEGIN
  -- Get the product
  SELECT * INTO product_record FROM products WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Loop through all active policies
  FOR policy_record IN
    SELECT * FROM product_policies WHERE is_active = true
  LOOP
    -- Evaluate based on policy type
    IF policy_record.name = 'french_translation_required' THEN
      evaluation_result := check_french_translation_policy(product_record.attributes);
      eval_status := evaluation_result->>'status';

      -- Insert or update evaluation
      INSERT INTO product_policy_evaluations (
        product_id,
        policy_id,
        status,
        violation_details,
        evaluated_at
      ) VALUES (
        p_product_id,
        policy_record.id,
        eval_status,
        CASE
          WHEN eval_status = 'violation' THEN evaluation_result
          ELSE '{}'::jsonb
        END,
        now()
      )
      ON CONFLICT (product_id, policy_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        violation_details = EXCLUDED.violation_details,
        evaluated_at = EXCLUDED.evaluated_at;

      -- Track worst status
      IF eval_status = 'violation' THEN
        worst_status := 'violation';
      ELSIF eval_status = 'warning' AND worst_status != 'violation' THEN
        worst_status := 'warning';
      END IF;
    END IF;
  END LOOP;

  -- Update product policy_status
  UPDATE products
  SET
    policy_status = worst_status,
    last_policy_check = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at on policies
DROP TRIGGER IF EXISTS update_product_policies_updated_at ON product_policies;
CREATE TRIGGER update_product_policies_updated_at
  BEFORE UPDATE ON product_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert the French translation policy
INSERT INTO product_policies (
  name,
  display_name,
  description,
  policy_type,
  severity,
  is_active,
  config
) VALUES (
  'french_translation_required',
  'French Translation Required',
  'Ensures that all products have a French translation for the name attribute. This is required for compliance with bilingual content requirements.',
  'translation',
  'warning',
  true,
  jsonb_build_object('required_fields', jsonb_build_array('name'))
)
ON CONFLICT (name) DO NOTHING;
