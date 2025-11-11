import { createClient } from '@supabase/supabase-js';

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

const tables = [
  'concepts', 'companies', 'stores', 'user_profiles',
  'placement_groups', 'product_templates', 'product_attribute_templates',
  'wand_integration_sources', 'integration_source_configs',
  'integration_products', 'integration_modifiers', 'integration_discounts',
  'products', 'organization_settings', 'qu_locations'
];

async function checkStatus() {
  console.log('\nCURRENT DATABASE STATUS:\n');
  
  for (const table of tables) {
    const { count } = await newDb.from(table).select('*', { count: 'exact', head: true });
    console.log('  ' + table.padEnd(40) + (count || 0) + ' rows');
  }
}

checkStatus().then(() => process.exit(0));
