import { createClient } from '@supabase/supabase-js';

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

async function checkTemplates() {
  console.log('\n========== CHECKING PRODUCT_ATTRIBUTE_TEMPLATES ==========\n');
  
  const { data, error } = await newDb
    .from('product_attribute_templates')
    .select('*');
  
  if (error) {
    console.log('ERROR:', error);
  } else {
    console.log('Success! Found ' + (data ? data.length : 0) + ' templates');
    if (data && data.length > 0) {
      data.forEach(t => {
        console.log('\n  - ' + t.name);
        console.log('    ID: ' + t.id);
        console.log('    Desc: ' + t.description);
      });
    } else {
      console.log('\n*** TABLE IS EMPTY - NEED TO MIGRATE 4 TEMPLATES ***');
    }
  }
  
  console.log('\n\n========== CHECKING ORGANIZATION_SETTINGS ==========\n');
  const { data: org, error: orgError } = await newDb
    .from('organization_settings')
    .select('*');
  
  if (orgError) {
    console.log('ERROR:', orgError);
  } else {
    console.log('Found ' + (org ? org.length : 0) + ' organization settings');
    if (org && org.length > 0) {
      console.log('  Default template ID:', org[0].default_product_attribute_template_id);
    }
  }
}

checkTemplates().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
