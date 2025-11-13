/*
  # Add Automatic Policy Evaluation on Product Update

  ## Overview
  This migration adds a trigger that automatically re-evaluates product policies
  whenever a product's attributes are updated.

  ## Changes
  - Create trigger function `trigger_evaluate_product_policies()` that calls the evaluation function
  - Add AFTER UPDATE trigger on products table that fires when attributes change
  - This ensures policy status is always up-to-date when products are modified

  ## Behavior
  - Trigger only fires when the `attributes` column is actually changed (not on every update)
  - Runs asynchronously after the product update completes
  - Updates policy_status and policy evaluations automatically
*/

-- Create trigger function to evaluate policies after product update
CREATE OR REPLACE FUNCTION trigger_evaluate_product_policies()
RETURNS TRIGGER AS $$
BEGIN
  -- Only evaluate if attributes actually changed
  IF (TG_OP = 'UPDATE' AND OLD.attributes IS DISTINCT FROM NEW.attributes) OR TG_OP = 'INSERT' THEN
    PERFORM evaluate_product_policies(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_product_policy_evaluation ON products;

-- Create trigger on products table
CREATE TRIGGER trigger_product_policy_evaluation
  AFTER INSERT OR UPDATE OF attributes ON products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_evaluate_product_policies();
