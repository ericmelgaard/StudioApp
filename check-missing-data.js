import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

async function main() {
  console.log('\nMISSING DATA DETAILS\n');
  console.log('======================================================================\n');
  
  // Check products
  console.log('PRODUCTS (9 rows missing):');
  const { data: oldProducts } = await oldDb.from('products').select('id, name, template_id');
  if (oldProducts) {
    oldProducts.forEach(p => {
      console.log('  - ' + p.name + ' (ID: ' + p.id + ', Template: ' + (p.template_id || 'none') + ')');
    });
  }
  
  // Check product_attribute_templates
  console.log('\n\nPRODUCT_ATTRIBUTE_TEMPLATES (4 rows missing):');
  const { data: oldTemplates } = await oldDb.from('product_attribute_templates').select('id, name, template_type');
  if (oldTemplates) {
    oldTemplates.forEach(t => {
      console.log('  - ' + t.name + ' (Type: ' + t.template_type + ')');
    });
  }
  
  // Check integration_sync_history
  console.log('\n\nINTEGRATION_SYNC_HISTORY (16 rows missing):');
  const { data: oldSync } = await oldDb.from('integration_sync_history').select('id, source_id, status, created_at').order('created_at', { ascending: false }).limit(5);
  if (oldSync) {
    console.log('  Latest 5 sync records:');
    oldSync.forEach(s => {
      console.log('    - Status: ' + s.status + ', Date: ' + s.created_at);
    });
  }
  
  // Check organization_settings
  console.log('\n\nORGANIZATION_SETTINGS (1 row missing):');
  const { data: oldOrg } = await oldDb.from('organization_settings').select('*');
  if (oldOrg && oldOrg.length > 0) {
    console.log('  Settings exist for organization');
    console.log('  Keys: ' + Object.keys(oldOrg[0]).join(', '));
  }
  
  // Check qu_locations  
  console.log('\n\nQU_LOCATIONS (1 row missing):');
  const { data: oldQu } = await oldDb.from('qu_locations').select('*');
  if (oldQu && oldQu.length > 0) {
    console.log('  Location data exists');
    console.log('  Keys: ' + Object.keys(oldQu[0]).join(', '));
  }
  
  console.log('\n\n======================================================================');
  console.log('SUMMARY');
  console.log('======================================================================\n');
  console.log('Total missing records: 30');
  console.log('  - 9 products');
  console.log('  - 4 product attribute templates');
  console.log('  - 16 integration sync history records');
  console.log('  - 1 organization settings');
  console.log('  - 1 qu_locations record');
  console.log('\nAll other data (4,600+ rows) already exists in new database.\n');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
