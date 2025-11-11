import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

// Migration order is critical - respect foreign key dependencies
const migrationOrder = [
  // Level 1: No dependencies
  { name: 'concepts', desc: 'Top-level concepts/brands' },
  { name: 'user_profiles', desc: 'User profiles' },
  { name: 'product_templates', desc: 'Product display templates' },
  { name: 'product_attribute_templates', desc: 'Product attribute schemas (QSR, Webtrition, etc.)' },
  { name: 'wand_integration_sources', desc: 'WAND integration source definitions' },
  
  // Level 2: Depend on concepts
  { name: 'companies', desc: 'Companies under concepts' },
  
  // Level 3: Depend on companies
  { name: 'stores', desc: 'Store locations' },
  
  // Level 4: Depend on stores
  { name: 'placement_groups', desc: 'Placement groups and hierarchies' },
  { name: 'integration_source_configs', desc: 'Integration configurations' },
  { name: 'qu_locations', desc: 'QU POS location mappings' },
  
  // Level 5: Depend on integration configs and stores
  { name: 'integration_products', desc: 'Products from integrations' },
  { name: 'integration_modifiers', desc: 'Modifiers from integrations' },
  { name: 'integration_discounts', desc: 'Discounts from integrations' },
  { name: 'integration_sync_history', desc: 'Integration sync history' },
  
  // Level 6: Depend on multiple tables
  { name: 'organization_settings', desc: 'Organization settings' },
  { name: 'integration_attribute_mappings', desc: 'Attribute mapping configurations' },
  { name: 'products', desc: 'Custom products' }
];

async function migrateTable(tableName, description) {
  console.log('\n[' + tableName + '] ' + description);
  console.log('  Fetching data from old database...');
  
  const { data: oldData, error: fetchError } = await oldDb
    .from(tableName)
    .select('*');
  
  if (fetchError) {
    console.log('  ERROR fetching: ' + fetchError.message);
    return { success: false, error: fetchError.message, count: 0 };
  }
  
  if (!oldData || oldData.length === 0) {
    console.log('  No data to migrate (table is empty)');
    return { success: true, count: 0 };
  }
  
  console.log('  Found ' + oldData.length + ' rows');
  console.log('  Inserting into new database...');
  
  const { data: insertedData, error: insertError } = await newDb
    .from(tableName)
    .insert(oldData)
    .select();
  
  if (insertError) {
    console.log('  ERROR inserting: ' + insertError.message);
    console.log('  Details: ' + JSON.stringify(insertError.details));
    return { success: false, error: insertError.message, count: 0 };
  }
  
  console.log('  SUCCESS: Migrated ' + (insertedData?.length || oldData.length) + ' rows');
  return { success: true, count: oldData.length };
}

async function migrate() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE DATABASE MIGRATION');
  console.log('FROM: igqlyqbhbqmxcksiuzix (OLD)');
  console.log('TO:   alqjamolvfnznxndyxbf (NEW)');
  console.log('='.repeat(80));
  
  const results = [];
  let totalRows = 0;
  
  for (const table of migrationOrder) {
    const result = await migrateTable(table.name, table.desc);
    results.push({ ...table, ...result });
    totalRows += result.count;
    
    if (!result.success) {
      console.log('\n*** MIGRATION STOPPED DUE TO ERROR ***');
      break;
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\nSuccessful: ' + successful.length + '/' + results.length + ' tables');
  console.log('Total rows migrated: ' + totalRows);
  
  if (failed.length > 0) {
    console.log('\nFailed tables:');
    failed.forEach(f => {
      console.log('  - ' + f.name + ': ' + f.error);
    });
  }
  
  console.log('\nMigrated tables:');
  successful.forEach(s => {
    if (s.count > 0) {
      console.log('  ' + s.name.padEnd(40) + String(s.count).padStart(6) + ' rows');
    }
  });
  
  console.log('\n');
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
