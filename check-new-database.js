import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

const tables = [
  'concepts', 'companies', 'stores',
  'user_profiles', 'placement_groups',
  'products', 'product_templates', 'product_attribute_templates',
  'wand_products', 'wand_templates', 'wand_integration_sources',
  'integration_sources', 'integration_products', 'integration_source_configs',
  'integration_modifiers', 'integration_discounts', 'integration_sync_history',
  'product_categories', 'organization_settings', 'qu_locations',
  'integration_attribute_mappings'
];

async function checkNewDatabase() {
  console.log('\n========== CHECKING NEW DATABASE (alqjamolvfnznxndyxbf) ==========\n');
  
  const results = {};
  
  for (const table of tables) {
    try {
      const { count, error } = await newDb
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
  
  const existing = Object.entries(results).filter(([k, v]) => v.status === 'exists');
  const missing = Object.entries(results).filter(([k, v]) => v.status === 'missing');
  
  console.log('Tables Found: ' + existing.length + '/' + tables.length + '\n');
  
  console.log('Tables with Data:');
  existing
    .filter(([k, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([table, data]) => {
      console.log('  ' + table.padEnd(40, ' ') + String(data.count).padStart(6, ' ') + ' rows');
    });
  
  console.log('\nEmpty Tables:');
  existing
    .filter(([k, v]) => v.count === 0)
    .forEach(([table]) => {
      console.log('  ' + table);
    });
  
  if (missing.length > 0) {
    console.log('\nMissing Tables (need migration):');
    missing.forEach(([table]) => {
      console.log('  ' + table);
    });
  }
  
  // Now compare with old database
  console.log('\n\n========== MIGRATION NEEDED ==========\n');
  
  const criticalTables = [
    'product_attribute_templates',
    'products', 
    'organization_settings',
    'integration_attribute_mappings',
    'qu_locations'
  ];
  
  for (const table of criticalTables) {
    const { count: oldCount } = await oldDb.from(table).select('*', { count: 'exact', head: true });
    const newData = results[table];
    const newCount = newData?.status === 'exists' ? newData.count : 0;
    
    if (oldCount > 0) {
      const status = newData?.status === 'exists' ? 
        (newCount === 0 ? '[EMPTY - NEEDS DATA]' : '[HAS DATA]') : 
        '[TABLE MISSING]';
      console.log(table.padEnd(40) + ' Old: ' + String(oldCount).padStart(3) + '  New: ' + String(newCount).padStart(3) + '  ' + status);
    }
  }
  
  console.log('\n');
}

checkNewDatabase().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
