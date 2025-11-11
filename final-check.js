import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteWNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

async function finalCheck() {
  console.log('\n========== FINAL DATA CHECK ==========\n');
  
  // Check products table
  console.log('PRODUCTS:');
  const { data: oldProds, error: oldProdErr } = await oldDb.from('products').select('mrn, name');
  const { data: newProds, error: newProdErr } = await newDb.from('products').select('mrn, name');
  
  console.log('  Old DB: ' + (oldProds ? oldProds.length : 'ERROR') + ' products');
  console.log('  New DB: ' + (newProds ? newProds.length : 'ERROR') + ' products');
  if (newProdErr) console.log('  Error: ' + newProdErr.message);
  
  // Check wand_products
  console.log('\nWAND_PRODUCTS:');
  const { data: oldWand, error: oldWandErr } = await oldDb.from('wand_products').select('id, name');
  const { data: newWand, error: newWandErr } = await newDb.from('wand_products').select('id, name');
  
  console.log('  Old DB: ' + (oldWand ? oldWand.length : 'ERROR') + ' wand products');
  console.log('  New DB: ' + (newWand ? newWand.length : 'ERROR') + ' wand products');
  
  // The critical ones - try with rpc or direct fetch
  console.log('\nChecking critical missing tables by trying different table names...');
  
  const possibleNames = [
    'product_attribute_templates',
    'product_attribute_template',
    'attribute_templates',
    'templates'
  ];
  
  for (const name of possibleNames) {
    const { data, error } = await newDb.from(name).select('id').limit(1);
    if (!error) {
      console.log('  ✓ Found table: ' + name);
    }
  }
}

finalCheck().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
