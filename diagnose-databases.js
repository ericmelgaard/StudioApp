import { createClient } from '@supabase/supabase-js';

// OLD/SOURCE Database
const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

// NEW/TARGET Database  
const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

const tables = [
  'concepts', 'companies', 'stores',
  'user_profiles', 'placement_groups',
  'products', 'product_templates', 'product_attribute_templates',
  'wand_products', 'wand_templates', 'wand_integration_sources',
  'integration_sources', 'integration_products', 'integration_source_configs',
  'integration_modifiers', 'integration_discounts', 'integration_sync_history',
  'product_categories', 'organization_settings', 'qu_locations'
];

async function checkDatabase(db, label) {
  const line = '======================================================================';
  console.log('\n' + line);
  console.log(label.toUpperCase());
  console.log(line);
  
  const results = {};
  
  for (const table of tables) {
    try {
      const { count, error } = await db
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        results[table] = { status: 'missing', error: error.message };
      } else {
        results[table] = { status: 'exists', count: count || 0 };
      }
    } catch (err) {
      results[table] = { status: 'error', error: err.message };
    }
  }
  
  // Print summary
  const existing = Object.entries(results).filter(([k, v]) => v.status === 'exists');
  const missing = Object.entries(results).filter(([k, v]) => v.status === 'missing');
  
  console.log('\nTables Found: ' + existing.length + '/' + tables.length);
  console.log('\nTables with Data:');
  existing
    .filter(([k, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([table, data]) => {
      const tableName = table.padEnd(35, ' ');
      const rowCount = String(data.count).padStart(6, ' ');
      console.log('  ' + tableName + ' ' + rowCount + ' rows');
    });
  
  console.log('\nEmpty Tables:');
  existing
    .filter(([k, v]) => v.count === 0)
    .forEach(([table, data]) => {
      console.log('  ' + table);
    });
  
  if (missing.length > 0) {
    console.log('\nMissing Tables:');
    missing.forEach(([table, data]) => {
      console.log('  ' + table);
    });
  }
  
  return results;
}

async function main() {
  console.log('\nDATABASE DIAGNOSTIC REPORT');
  console.log('Generated: ' + new Date().toISOString());
  
  const oldResults = await checkDatabase(oldDb, 'OLD/SOURCE Database (igqlyqbhbqmxcksiuzix)');
  const newResults = await checkDatabase(newDb, 'NEW/TARGET Database (gxfclamonevgxmdqexzs)');
  
  // Migration summary
  const line = '======================================================================';
  console.log('\n' + line);
  console.log('MIGRATION ANALYSIS');
  console.log(line);
  
  const oldTables = Object.entries(oldResults).filter(([k, v]) => v.status === 'exists' && v.count > 0);
  const newTables = Object.entries(newResults).filter(([k, v]) => v.status === 'exists');
  
  console.log('\nData to Migrate:');
  oldTables.forEach(([table, data]) => {
    const newData = newResults[table];
    const newCount = newData && newData.status === 'exists' ? newData.count : 0;
    const status = newData && newData.status === 'exists' ? 'table exists' : 'table missing';
    const tableName = table.padEnd(35, ' ');
    const oldCount = String(data.count).padStart(6, ' ');
    const newCountStr = String(newCount).padStart(6, ' ');
    console.log('  ' + tableName + ' ' + oldCount + ' rows -> ' + newCountStr + ' rows  ' + status);
  });
  
  console.log('\n');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
