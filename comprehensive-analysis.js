import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

async function comprehensiveAnalysis() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE DATABASE ANALYSIS');
  console.log('='.repeat(80) + '\n');
  
  const tablesToCheck = [
    { name: 'concepts', key: 'id' },
    { name: 'companies', key: 'id' },
    { name: 'stores', key: 'id' },
    { name: 'user_profiles', key: 'id' },
    { name: 'placement_groups', key: 'id' },
    { name: 'product_templates', key: 'id' },
    { name: 'integration_products', key: 'id' },
    { name: 'integration_modifiers', key: 'id' },
    { name: 'wand_integration_sources', key: 'id' },
    { name: 'integration_source_configs', key: 'id' }
  ];
  
  console.log('TABLE-BY-TABLE COMPARISON:\n');
  
  for (const table of tablesToCheck) {
    const { count: oldCount } = await oldDb.from(table.name).select('*', { count: 'exact', head: true });
    const { count: newCount } = await newDb.from(table.name).select('*', { count: 'exact', head: true });
    
    const oldStr = String(oldCount || 0).padStart(6);
    const newStr = String(newCount || 0).padStart(6);
    const match = oldCount === newCount ? '✓' : '✗';
    
    console.log(match + '  ' + table.name.padEnd(35) + '  Old: ' + oldStr + '  New: ' + newStr);
  }
  
  // Now check the problematic ones
  console.log('\n\nPROBLEMATIC TABLES:\n');
  
  const problematicTables = [
    'product_attribute_templates',
    'products',
    'organization_settings',
    'wand_products',
    'integration_attribute_mappings',
    'qu_locations'
  ];
  
  for (const tableName of problematicTables) {
    const { count: oldCount, error: oldErr } = await oldDb.from(tableName).select('*', { count: 'exact', head: true });
    const { count: newCount, error: newErr } = await newDb.from(tableName).select('*', { count: 'exact', head: true });
    
    let status = '';
    if (oldErr && newErr) {
      status = '[MISSING IN BOTH]';
    } else if (newErr) {
      status = '[MISSING IN NEW] - HAS ' + (oldCount || 0) + ' in old';
    } else if (oldErr) {
      status = '[MISSING IN OLD] - HAS ' + (newCount || 0) + ' in new';
    } else {
      status = 'Old: ' + (oldCount || 0) + ', New: ' + (newCount || 0);
    }
    
    console.log('  ' + tableName.padEnd(40) + '  ' + status);
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('CRITICAL FINDINGS');
  console.log('='.repeat(80) + '\n');
  
  // Check if product_attribute_templates exists with different approach
  const { data: oldTemplates } = await oldDb.from('product_attribute_templates').select('id, name');
  const { error: newTemplError } = await newDb.from('product_attribute_templates').select('id, name');
  
  if (oldTemplates && oldTemplates.length > 0 && newTemplError) {
    console.log('CRITICAL: product_attribute_templates table exists in OLD but not in NEW');
    console.log('          This table contains the QSR, Webtrition, Retail, Custom templates');
    console.log('          The NEW database needs this table created AND data migrated');
    console.log('\n          Missing templates:');
    oldTemplates.forEach(t => {
      console.log('            - ' + t.name + ' (' + t.id + ')');
    });
  }
  
  console.log('\n');
}

comprehensiveAnalysis().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
