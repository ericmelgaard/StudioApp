import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

// Define column mappings - old column -> new column
const columnMaps = {
  concepts: {
    id: 'id',
    name: 'name',
    privilege_level: 'privilege_level',
    parent_level: 'parent_level',
    domain_level: 'domain_level',
    group_type_string: 'group_type_string',
    parent_key: 'parent_key',
    created_at: 'created_at',
    brand_primary_color: 'primary_color',
    brand_secondary_color: 'secondary_color'
  },
  companies: {
    id: 'id',
    name: 'name',
    concept_id: 'concept_id',
    privilege_level: 'privilege_level',
    parent_level: 'parent_level',
    domain_level: 'domain_level',
    group_type_string: 'group_type_string',
    parent_key: 'parent_key',
    created_at: 'created_at'
  },
  stores: {
    id: 'id',
    name: 'name',
    company_id: 'company_id',
    privilege_level: 'privilege_level',
    parent_level: 'parent_level',
    domain_level: 'domain_level',
    group_type_string: 'group_type_string',
    parent_key: 'parent_key',
    grand_parent_key: 'grand_parent_key',
    latitude: 'latitude',
    longitude: 'longitude',
    address: 'address_line1',
    city: 'city',
    state: 'state_code',
    zip_code: 'postal_code',
    phone: 'phone',
    created_at: 'created_at'
  },
  user_profiles: {
    id: 'id',
    email: 'email',
    role: 'role',
    display_name: 'display_name',
    created_at: 'created_at',
    updated_at: 'updated_at',
    concept_id: 'location_scope_concept_id',
    company_id: 'location_scope_company_id',
    store_id: 'location_scope_store_id'
  }
};

// Simple column copy for tables with matching schemas
const simpleTables = [
  'placement_groups',
  'product_templates',
  'wand_integration_sources',
  'integration_source_configs',
  'integration_products',
  'integration_modifiers',
  'integration_discounts',
  'integration_sync_history',
  'qu_locations'
];

async function migrateWithMapping(tableName, columnMap) {
  console.log('\n[' + tableName + '] Migrating with column mapping');
  
  const { data: oldData, error: fetchError } = await oldDb.from(tableName).select('*');
  
  if (fetchError) {
    return { success: false, error: fetchError.message, count: 0 };
  }
  
  if (!oldData || oldData.length === 0) {
    console.log('  No data to migrate');
    return { success: true, count: 0 };
  }
  
  // Map columns
  const mappedData = oldData.map(row => {
    const newRow = {};
    for (const [oldCol, newCol] of Object.entries(columnMap)) {
      if (row[oldCol] !== undefined) {
        newRow[newCol] = row[oldCol];
      }
    }
    return newRow;
  });
  
  console.log('  Mapped ' + oldData.length + ' rows');
  const { error: insertError } = await newDb.from(tableName).insert(mappedData);
  
  if (insertError) {
    console.log('  ERROR: ' + insertError.message);
    return { success: false, error: insertError.message, count: 0 };
  }
  
  console.log('  SUCCESS: Migrated ' + oldData.length + ' rows');
  return { success: true, count: oldData.length };
}

async function migrateSimple(tableName) {
  console.log('\n[' + tableName + '] Migrating (no mapping needed)');
  
  const { data: oldData, error: fetchError } = await oldDb.from(tableName).select('*');
  
  if (fetchError) {
    return { success: false, error: fetchError.message, count: 0 };
  }
  
  if (!oldData || oldData.length === 0) {
    console.log('  No data to migrate');
    return { success: true, count: 0 };
  }
  
  const { error: insertError } = await newDb.from(tableName).insert(oldData);
  
  if (insertError) {
    console.log('  ERROR: ' + insertError.message);
    return { success: false, error: insertError.message, count: 0 };
  }
  
  console.log('  SUCCESS: Migrated ' + oldData.length + ' rows');
  return { success: true, count: oldData.length };
}

async function migrate() {
  console.log('\n' + '='.repeat(80));
  console.log('SMART DATABASE MIGRATION');
  console.log('='.repeat(80));
  
  let totalRows = 0;
  const results = [];
  
  // Migrate with column mapping
  for (const [table, map] of Object.entries(columnMaps)) {
    const result = await migrateWithMapping(table, map);
    results.push({ table, ...result });
    totalRows += result.count;
    if (!result.success) break;
  }
  
  // Migrate simple tables
  for (const table of simpleTables) {
    const result = await migrateSimple(table);
    results.push({ table, ...result });
    totalRows += result.count;
    if (!result.success) break;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('MIGRATION COMPLETE');
  console.log('Total rows migrated: ' + totalRows);
  console.log('='.repeat(80) + '\n');
  
  results.filter(r => r.success && r.count > 0).forEach(r => {
    console.log('  ' + r.table.padEnd(40) + String(r.count).padStart(6) + ' rows');
  });
  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\nFailed:');
    failed.forEach(r => console.log('  ' + r.table + ': ' + r.error));
  }
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
