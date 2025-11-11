import { createClient } from '@supabase/supabase-js';

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

// Try to query the information schema using RPC or raw SQL
async function listTables() {
  console.log('\n========== ATTEMPTING TO LIST ALL TABLES ==========\n');
  
  // Try common table names
  const commonTables = [
    'concepts', 'companies', 'stores',
    'user_profiles', 
    'placement_groups',
    'products', 'product_templates',
    'wand_products', 'wand_templates', 'wand_integration_sources',
    'integration_sources', 'integration_products', 'integration_source_configs',
    'integration_modifiers', 'integration_discounts',
    'integration_sync_history'
  ];
  
  console.log('Tables that exist:');
  for (const table of commonTables) {
    const { error } = await newDb.from(table).select('id', { count: 'exact', head: true });
    if (!error) {
      console.log('  ✓ ' + table);
    }
  }
  
  console.log('\nTables that DO NOT exist:');
  for (const table of commonTables) {
    const { error } = await newDb.from(table).select('id', { count: 'exact', head: true });
    if (error) {
      console.log('  ✗ ' + table);
    }
  }
}

listTables().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
