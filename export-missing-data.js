import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

async function main() {
  console.log('DETAILED MISSING DATA EXPORT\n');
  
  // Products
  console.log('=== PRODUCTS ===\n');
  const { data: products } = await oldDb.from('products').select('*');
  console.log('Count: ' + (products ? products.length : 0));
  if (products) {
    console.log(JSON.stringify(products, null, 2));
  }
  
  // Product attribute templates
  console.log('\n\n=== PRODUCT_ATTRIBUTE_TEMPLATES ===\n');
  const { data: templates } = await oldDb.from('product_attribute_templates').select('*');
  console.log('Count: ' + (templates ? templates.length : 0));
  if (templates) {
    console.log(JSON.stringify(templates, null, 2));
  }
  
  // Organization settings
  console.log('\n\n=== ORGANIZATION_SETTINGS ===\n');
  const { data: org } = await oldDb.from('organization_settings').select('*');
  console.log('Count: ' + (org ? org.length : 0));
  if (org) {
    console.log(JSON.stringify(org, null, 2));
  }
  
  // QU Locations
  console.log('\n\n=== QU_LOCATIONS ===\n');
  const { data: qu } = await oldDb.from('qu_locations').select('*');
  console.log('Count: ' + (qu ? qu.length : 0));
  if (qu) {
    console.log(JSON.stringify(qu, null, 2));
  }
  
  // Integration sync history (last 5)
  console.log('\n\n=== INTEGRATION_SYNC_HISTORY (Latest 5) ===\n');
  const { data: sync } = await oldDb.from('integration_sync_history').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Count: ' + (sync ? sync.length : 0));
  if (sync) {
    console.log(JSON.stringify(sync, null, 2));
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
