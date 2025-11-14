import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testStateModel() {
  console.log('\n=== Testing Product State Model ===\n');

  // Get the Dip-Caramel product
  const productId = 'ae1c3b66-6ca4-48fb-904c-ec6d690958ab';

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return;
  }

  console.log('Product Name:', product.name);
  console.log('Product ID:', product.id);
  console.log('\n--- Current State ---');
  console.log('Mapping ID:', product.mapping_id || 'Not linked');
  console.log('Integration Source ID:', product.integration_source_id || 'Not linked');
  console.log('Integration Type:', product.integration_type || 'N/A');
  console.log('Local Fields:', product.local_fields || []);
  console.log('Price Calculations:', product.price_calculations || {});
  console.log('\n--- Attributes ---');
  console.log('Price:', product.attributes.price);
  console.log('Calories:', product.attributes.calories);
  console.log('Category:', product.attributes.category);

  // Check if there are any integration sources available
  console.log('\n--- Available Integration Sources ---');
  const { data: sources } = await supabase
    .from('wand_integration_sources')
    .select('id, name, integration_type, status')
    .limit(5);

  if (sources && sources.length > 0) {
    sources.forEach(source => {
      console.log(`- ${source.name} (${source.integration_type}) - Status: ${source.status}`);
    });
  } else {
    console.log('No integration sources found');
  }

  // Check if there are any integration products
  console.log('\n--- Sample Integration Products ---');
  const { data: intProducts } = await supabase
    .from('integration_products')
    .select('mapping_id, name, wand_source_id')
    .limit(3);

  if (intProducts && intProducts.length > 0) {
    intProducts.forEach(p => {
      console.log(`- ${p.name} (Mapping ID: ${p.mapping_id})`);
    });
  } else {
    console.log('No integration products found');
  }

  console.log('\n=== Test Complete ===\n');
}

testStateModel().catch(console.error);
