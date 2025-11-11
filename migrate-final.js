import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

async function migrateTable(table, selectCols, mapFn) {
  console.log('\n[' + table + ']');
  const { data, error: fetchError } = await oldDb.from(table).select(selectCols || '*');
  
  if (fetchError || !data || data.length === 0) {
    console.log('  Skipped (no data or error)');
    return 0;
  }
  
  const mappedData = mapFn ? data.map(mapFn) : data;
  const { error } = await newDb.from(table).insert(mappedData);
  
  if (error) {
    console.log('  ERROR: ' + error.message);
    return 0;
  }
  
  console.log('  SUCCESS: ' + data.length + ' rows');
  return data.length;
}

async function migrate() {
  console.log('\nMIGRATING REMAINING TABLES...\n');
  let total = 0;
  
  // Stores (remaining 423 rows - pagination)
  console.log('[stores] Fetching remaining rows...');
  const { data: remainingStores } = await oldDb.from('stores').select('*').range(1000, 1999);
  if (remainingStores && remainingStores.length > 0) {
    const mapped = remainingStores.map(r => ({
      id: r.id,
      name: r.name,
      company_id: r.company_id,
      privilege_level: r.privilege_level,
      parent_level: r.parent_level,
      domain_level: r.domain_level,
      group_type_string: r.group_type_string,
      parent_key: r.parent_key,
      grand_parent_key: r.grand_parent_key,
      latitude: r.latitude,
      longitude: r.longitude,
      address_line1: r.address,
      city: r.city,
      state_code: r.state,
      postal_code: r.zip_code,
      phone: r.phone,
      created_at: r.created_at
    }));
    const { error } = await newDb.from('stores').insert(mapped);
    if (!error) {
      console.log('  SUCCESS: ' + remainingStores.length + ' additional stores');
      total += remainingStores.length;
    }
  }
  
  // Placement groups - only copy compatible columns
  total += await migrateTable('placement_groups', 'id,name,parent_id,store_id,placement_type,attributes,sort_order,created_at,updated_at');
  
  // Product templates  
  total += await migrateTable('product_templates', '*');
  
  // WAND integration sources
  total += await migrateTable('wand_integration_sources', '*');
  
  // Integration source configs
  total += await migrateTable('integration_source_configs', '*');
  
  // Integration products
  total += await migrateTable('integration_products', '*');
  
  // Integration modifiers
  total += await migrateTable('integration_modifiers', '*');
  
  // Integration discounts
  total += await migrateTable('integration_discounts', '*');
  
  // Integration sync history
  total += await migrateTable('integration_sync_history', '*');
  
  // Product attribute templates (THE CRITICAL ONE!)
  total += await migrateTable('product_attribute_templates', '*');
  
  // Organization settings
  total += await migrateTable('organization_settings', '*');
  
  // Integration attribute mappings
  total += await migrateTable('integration_attribute_mappings', '*');
  
  // QU locations
  total += await migrateTable('qu_locations', '*');
  
  // Products - with column mapping
  total += await migrateTable('products', '*', row => ({
    mrn: row.mrn,
    external_id: row.external_id,
    string_id: row.string_id,
    name: row.name,
    description: row.description,
    price: row.price,
    calories: row.calories,
    sort_order: row.sort_order,
    template_id: row.template_id,
    integration_product_id: row.integration_product_id,
    attribute_template_id: row.attribute_template_id,
    attributes: row.attributes,
    attribute_mappings: row.attribute_mappings,
    attribute_overrides: row.attribute_overrides,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
  
  console.log('\n' + '='.repeat(60));
  console.log('TOTAL NEW ROWS MIGRATED: ' + total);
  console.log('='.repeat(60) + '\n');
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
