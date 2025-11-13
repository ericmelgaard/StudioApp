import { supabase } from './supabase';

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  displayName: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  missingFields?: string[];
}

export interface PolicyEvaluation {
  productId: string;
  status: 'compliant' | 'warning' | 'violation';
  violations: PolicyViolation[];
  lastChecked: string | null;
}

export async function evaluateProductPolicy(productId: string): Promise<void> {
  const { error } = await supabase.rpc('evaluate_product_policies', {
    p_product_id: productId
  });

  if (error) {
    console.error('Error evaluating product policies:', error);
    throw error;
  }
}

export async function getProductPolicyStatus(productId: string): Promise<PolicyEvaluation> {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('policy_status, last_policy_check')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    console.error('Error fetching product policy status:', productError);
    throw productError;
  }

  const { data: evaluations, error: evalError } = await supabase
    .from('product_policy_evaluations')
    .select(`
      id,
      status,
      violation_details,
      product_policies (
        id,
        name,
        display_name,
        severity
      )
    `)
    .eq('product_id', productId)
    .eq('status', 'violation');

  if (evalError) {
    console.error('Error fetching policy evaluations:', evalError);
    throw evalError;
  }

  const violations: PolicyViolation[] = (evaluations || []).map((eval: any) => ({
    policyId: eval.product_policies.id,
    policyName: eval.product_policies.name,
    displayName: eval.product_policies.display_name,
    severity: eval.product_policies.severity,
    message: eval.violation_details?.message || 'Policy violation detected',
    missingFields: eval.violation_details?.missing_fields || []
  }));

  return {
    productId,
    status: product?.policy_status || 'compliant',
    violations,
    lastChecked: product?.last_policy_check || null
  };
}

export async function evaluateAllProducts(): Promise<void> {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id');

  if (productsError) {
    console.error('Error fetching products for policy evaluation:', productsError);
    throw productsError;
  }

  if (!products || products.length === 0) {
    return;
  }

  for (const product of products) {
    try {
      await evaluateProductPolicy(product.id);
    } catch (error) {
      console.error(`Error evaluating policies for product ${product.id}:`, error);
    }
  }
}

export async function checkFrenchTranslation(attributes: Record<string, any>): boolean {
  const frTranslations = attributes?.translations_fr_fr;

  if (!frTranslations) {
    return false;
  }

  const frName = frTranslations.name;
  return !!(frName && frName.trim() !== '');
}

export async function getActivePolicies() {
  const { data, error } = await supabase
    .from('product_policies')
    .select('*')
    .eq('is_active', true)
    .order('display_name');

  if (error) {
    console.error('Error fetching active policies:', error);
    throw error;
  }

  return data || [];
}

export async function getPolicyViolationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('policy_status', 'violation');

  if (error) {
    console.error('Error fetching policy violation count:', error);
    return 0;
  }

  return count || 0;
}
