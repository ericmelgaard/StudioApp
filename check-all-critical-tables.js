import { createClient } from '@supabase/supabase-js';

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

const criticalTables = [
  'product_attribute_templates',
  'products',
  'product_templates', 
  'organization_settings',
  'integration_attribute_mappings',
  'available_attributes',
  'product_categories',
  'integration_sources',
  'qu_locations'
];

async function checkTables() {
  console.log('\n========== CRITICAL TABLES CHECK ==========\n');
  
  for (const table of criticalTables) {
    try {
      const { count, error } = await newDb
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('not find the table')) {
          console.log('[MISSING] ' + table.padEnd(40) + ' - TABLE DOES NOT EXIST');
        } else {
          console.log('[ERROR]   ' + table.padEnd(40) + ' - ' + error.message);
        }
      } else {
        const status = count === 0 ? '[EMPTY]   ' : '[OK]      ';
        console.log(status + table.padEnd(40) + ' - ' + count + ' rows');
      }
    } catch (err) {
      console.log('[ERROR]   ' + table.padEnd(40) + ' - ' + err.message);
    }
  }
  
  console.log('\n');
}

checkTables().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
