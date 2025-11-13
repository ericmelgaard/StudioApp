import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function evaluateAllProductPolicies() {
  console.log('Starting policy evaluation for all products...\n');

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name');

  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products found to evaluate.');
    return;
  }

  console.log(`Found ${products.length} products to evaluate.\n`);

  let evaluated = 0;
  let errors = 0;

  for (const product of products) {
    try {
      const { error } = await supabase.rpc('evaluate_product_policies', {
        p_product_id: product.id
      });

      if (error) {
        console.error(`Error evaluating product ${product.name} (${product.id}):`, error.message);
        errors++;
      } else {
        evaluated++;
        if (evaluated % 10 === 0) {
          console.log(`Evaluated ${evaluated}/${products.length} products...`);
        }
      }
    } catch (err) {
      console.error(`Exception evaluating product ${product.name} (${product.id}):`, err);
      errors++;
    }
  }

  console.log(`\nPolicy evaluation complete!`);
  console.log(`Successfully evaluated: ${evaluated} products`);
  console.log(`Errors: ${errors}`);

  const { data: violations, error: violationsError } = await supabase
    .from('products')
    .select('id, name, policy_status')
    .eq('policy_status', 'violation');

  if (!violationsError && violations) {
    console.log(`\nProducts with policy violations: ${violations.length}`);
    if (violations.length > 0) {
      console.log('\nViolations:');
      violations.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name} (${p.id})`);
      });
    }
  }
}

evaluateAllProductPolicies()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
