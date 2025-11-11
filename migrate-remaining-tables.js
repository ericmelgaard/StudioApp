import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrateIntegrationAttributeMappings() {
  console.log('\n📦 Migrating integration_attribute_mappings...');

  const { data: oldData, error: fetchError } = await oldDb
    .from('integration_attribute_mappings')
    .select('*');

  if (fetchError) {
    console.error(`  ❌ Error fetching: ${fetchError.message}`);
    return { success: false };
  }

  if (!oldData || oldData.length === 0) {
    console.log('  ⚠️  No data to migrate');
    return { success: true, count: 0 };
  }

  console.log(`  📥 Found ${oldData.length} rows`);

  // Map old schema to new schema - keep only the fields that exist in new schema
  const mappedData = oldData.map(row => ({
    id: row.id,
    wand_integration_source_id: row.wand_integration_source_id,
    integration_type: row.integration_type || 'Products',
    product_attribute_template_id: row.product_attribute_template_id,
    field_mappings: row.attribute_mappings || {},
    created_at: row.created_at,
    updated_at: row.updated_at
  }));

  const { error: insertError } = await newDb
    .from('integration_attribute_mappings')
    .upsert(mappedData, { onConflict: 'id' });

  if (insertError) {
    console.error(`  ❌ Error inserting: ${insertError.message}`);
    return { success: false };
  }

  console.log(`  ✅ Successfully migrated ${mappedData.length} rows`);
  return { success: true, count: mappedData.length };
}

async function migrateProducts() {
  console.log('\n📦 Migrating products...');

  const { data: oldData, error: fetchError } = await oldDb
    .from('products')
    .select('*');

  if (fetchError) {
    console.error(`  ❌ Error fetching: ${fetchError.message}`);
    return { success: false };
  }

  if (!oldData || oldData.length === 0) {
    console.log('  ⚠️  No data to migrate');
    return { success: true, count: 0 };
  }

  console.log(`  📥 Found ${oldData.length} rows`);

  // Map old schema (with mrn) to new schema (with id)
  const mappedData = oldData.map(row => ({
    id: row.mrn,  // Map mrn to id
    name: row.name,
    attributes: row.attributes || {},
    attribute_mappings: row.attribute_mappings || {},
    attribute_overrides: row.attribute_overrides || {},
    attribute_template_id: row.attribute_template_id,
    display_template_id: row.display_template_id,
    integration_product_id: row.integration_product_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));

  const { error: insertError } = await newDb
    .from('products')
    .upsert(mappedData, { onConflict: 'id' });

  if (insertError) {
    console.error(`  ❌ Error inserting: ${insertError.message}`);
    return { success: false };
  }

  console.log(`  ✅ Successfully migrated ${mappedData.length} rows`);
  return { success: true, count: mappedData.length };
}

async function migrateProductCategories() {
  console.log('\n📦 Migrating product_categories...');

  const { data: oldData, error: fetchError } = await oldDb
    .from('product_categories')
    .select('*');

  if (fetchError) {
    console.error(`  ❌ Error fetching: ${fetchError.message}`);
    return { success: false };
  }

  if (!oldData || oldData.length === 0) {
    console.log('  ⚠️  No data to migrate');
    return { success: true, count: 0 };
  }

  console.log(`  📥 Found ${oldData.length} rows`);

  const { error: insertError } = await newDb
    .from('product_categories')
    .upsert(oldData, { onConflict: 'id' });

  if (insertError) {
    console.error(`  ❌ Error inserting: ${insertError.message}`);
    return { success: false };
  }

  console.log(`  ✅ Successfully migrated ${oldData.length} rows`);
  return { success: true, count: oldData.length };
}

async function migrateProductCategoryAssignments() {
  console.log('\n📦 Migrating product_category_assignments...');

  const { data: oldData, error: fetchError } = await oldDb
    .from('product_category_assignments')
    .select('*');

  if (fetchError) {
    console.error(`  ❌ Error fetching: ${fetchError.message}`);
    return { success: false };
  }

  if (!oldData || oldData.length === 0) {
    console.log('  ⚠️  No data to migrate');
    return { success: true, count: 0 };
  }

  console.log(`  📥 Found ${oldData.length} rows`);

  const { error: insertError } = await newDb
    .from('product_category_assignments')
    .upsert(oldData, { onConflict: 'id' });

  if (insertError) {
    console.error(`  ❌ Error inserting: ${insertError.message}`);
    return { success: false };
  }

  console.log(`  ✅ Successfully migrated ${oldData.length} rows`);
  return { success: true, count: oldData.length };
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATING REMAINING TABLES                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  const results = {};

  results.integration_attribute_mappings = await migrateIntegrationAttributeMappings();
  results.products = await migrateProducts();
  results.product_categories = await migrateProductCategories();
  results.product_category_assignments = await migrateProductCategoryAssignments();

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION SUMMARY                                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let totalMigrated = 0;
  let successCount = 0;

  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    const count = result.count || 0;
    console.log(`${status} ${table.padEnd(45)} ${count} rows`);

    if (result.success) {
      successCount++;
      totalMigrated += count;
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`Total rows migrated: ${totalMigrated}`);
  console.log(`Tables succeeded: ${successCount}/${Object.keys(results).length}`);
  console.log('─'.repeat(70) + '\n');

  if (successCount < Object.keys(results).length) {
    console.log('⚠️  Some tables failed to migrate.');
    process.exit(1);
  } else {
    console.log('🎉 All remaining tables migrated successfully!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('\n\n❌ Fatal error:', err);
  process.exit(1);
});
