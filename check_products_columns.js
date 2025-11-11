import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkProductsSchema() {
  console.log('Checking products table schema...\n');
  
  // Try to query the table with all possible columns
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error querying products:', error);
  } else {
    console.log('Sample row:', data);
    if (data && data.length > 0) {
      console.log('\nColumns present:', Object.keys(data[0]));
    } else {
      console.log('\nTable exists but has no rows');
    }
  }
  
  // Try inserting a test row to see what schema is expected
  console.log('\nAttempting test insert to check schema...');
  const testProduct = {
    name: 'TEST_SCHEMA_CHECK',
    attributes: { test: true },
    attribute_mappings: { test: 'value' }
  };
  
  const { error: insertError } = await supabase
    .from('products')
    .insert(testProduct);
  
  if (insertError) {
    console.error('Insert error:', insertError.message);
    console.error('Details:', insertError.details);
  } else {
    console.log('Test insert succeeded - cleaning up...');
    await supabase.from('products').delete().eq('name', 'TEST_SCHEMA_CHECK');
  }
}

checkProductsSchema().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
