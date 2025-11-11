import { createClient } from '@supabase/supabase-js';

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

async function discoverSchema() {
  console.log('\n========== DISCOVERING ACTUAL SCHEMA ==========\n');
  
  // Try to get a single row from each table to see what columns exist
  console.log('PRODUCTS table:');
  const { data: prod, error: prodErr } = await newDb.from('products').select('*').limit(1);
  if (prodErr) {
    console.log('  Error:', prodErr.message);
  } else {
    if (prod && prod.length > 0) {
      console.log('  Columns:', Object.keys(prod[0]).join(', '));
    } else {
      console.log('  Table is empty');
    }
  }
  
  console.log('\nWAND_PRODUCTS table:');
  const { data: wand, error: wandErr } = await newDb.from('wand_products').select('*').limit(1);
  if (wandErr) {
    console.log('  Error:', wandErr.message);
  } else {
    if (wand && wand.length > 0) {
      console.log('  Columns:', Object.keys(wand[0]).join(', '));
    } else {
      console.log('  Table is empty');
    }
  }
  
  console.log('\nPRODUCT_TEMPLATES table:');
  const { data: templ, error: templErr } = await newDb.from('product_templates').select('*').limit(1);
  if (templErr) {
    console.log('  Error:', templErr.message);
  } else {
    if (templ && templ.length > 0) {
      console.log('  Columns:', Object.keys(templ[0]).join(', '));
      console.log('  Sample:', templ[0].name);
    } else {
      console.log('  Table is empty');
    }
  }
}

discoverSchema().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
