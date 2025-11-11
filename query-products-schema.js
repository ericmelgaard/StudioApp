import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function queryProductsSchema() {
  console.log('Querying products table schema...\n');
  
  // Get a sample row to see what columns exist
  const { data: sampleData, error: sampleError } = await supabase
    .from('products')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('Error querying products:', sampleError.message);
  } else {
    if (sampleData && sampleData.length > 0) {
      console.log('Columns in products table:');
      Object.keys(sampleData[0]).forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('No rows in products table, attempting test insert to discover schema...');
    }
  }
  
  // Try inserting with expected columns to see what works
  console.log('\nTesting required columns for import flow:');
  
  const testCases = [
    { field: 'name', value: 'TEST_SCHEMA_CHECK', required: true },
    { field: 'attributes', value: { test: true }, required: true },
    { field: 'attribute_mappings', value: { test: 'value' }, required: true },
    { field: 'attribute_overrides', value: { test: true }, required: true },
    { field: 'attribute_template_id', value: null, required: true },
    { field: 'integration_product_id', value: null, required: true }
  ];
  
  for (const test of testCases) {
    const testObj = { name: 'TEST_SCHEMA_CHECK' };
    if (test.field !== 'name') {
      testObj[test.field] = test.value;
    }
    
    const { error } = await supabase
      .from('products')
      .insert(testObj);
    
    if (error) {
      console.log(`  ✗ ${test.field}: ${error.message}`);
    } else {
      console.log(`  ✓ ${test.field}: exists`);
      // Clean up
      await supabase.from('products').delete().eq('name', 'TEST_SCHEMA_CHECK');
    }
  }
}

queryProductsSchema().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
