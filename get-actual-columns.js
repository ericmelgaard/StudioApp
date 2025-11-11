import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function getActualColumns() {
  console.log('Inserting minimal row to discover actual schema...\n');
  
  // Insert a minimal valid row
  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert({ name: 'SCHEMA_TEST' })
    .select();
  
  if (insertError) {
    console.error('Error inserting:', insertError.message);
    return;
  }
  
  if (inserted && inserted.length > 0) {
    console.log('Actual columns in products table:');
    console.log('==================================');
    Object.keys(inserted[0]).sort().forEach(col => {
      const value = inserted[0][col];
      const type = value === null ? 'null' : typeof value;
      console.log(`  ${col.padEnd(30)} (${type})`);
    });
    
    // Clean up
    await supabase.from('products').delete().eq('name', 'SCHEMA_TEST');
    
    console.log('\n\nMissing columns needed for import:');
    console.log('===================================');
    const missing = [
      'attributes',
      'attribute_mappings', 
      'attribute_overrides',
      'attribute_template_id'
    ];
    
    const actual = Object.keys(inserted[0]);
    missing.forEach(col => {
      if (!actual.includes(col)) {
        console.log(`  ✗ ${col}`);
      }
    });
  }
}

getActualColumns().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
