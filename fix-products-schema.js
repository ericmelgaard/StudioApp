import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixProductsSchema() {
  console.log('Fixing products table schema...\n');
  console.log('Database:', process.env.VITE_SUPABASE_URL);
  console.log('');

  const sql = `
    -- Add missing columns
    ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS attribute_mappings jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS attribute_overrides jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS attribute_template_id uuid,
      ADD COLUMN IF NOT EXISTS display_template_id uuid;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);
    CREATE INDEX IF NOT EXISTS idx_products_attribute_template_id ON products(attribute_template_id);
    CREATE INDEX IF NOT EXISTS idx_products_display_template_id ON products(display_template_id);
  `;

  console.log('Executing schema fix...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('✗ Schema fix failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } else {
    console.log('✓ Schema fix executed');
  }

  // Verify the fix
  console.log('\nVerifying schema...');
  const { data: testData, error: testError } = await supabase
    .from('products')
    .insert({
      name: 'SCHEMA_VERIFICATION_TEST',
      attributes: { test: true },
      attribute_mappings: { test: 'field' },
      attribute_overrides: {},
      attribute_template_id: null
    })
    .select();

  if (testError) {
    console.error('✗ Verification failed:', testError.message);
    process.exit(1);
  } else {
    console.log('✓ Schema verified successfully!');
    console.log('  - All required columns are present');
    console.log('  - Products can be inserted with attribute data');
    
    // Clean up test record
    await supabase.from('products').delete().eq('name', 'SCHEMA_VERIFICATION_TEST');
  }

  // Show final schema
  const { data: finalData } = await supabase
    .from('products')
    .insert({ name: 'FINAL_CHECK' })
    .select();
  
  if (finalData && finalData.length > 0) {
    console.log('\nFinal products table columns:');
    Object.keys(finalData[0]).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
    await supabase.from('products').delete().eq('name', 'FINAL_CHECK');
  }
}

fixProductsSchema().then(() => {
  console.log('\n✓ Products table schema fixed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('\n✗ Fatal error:', err);
  process.exit(1);
});
