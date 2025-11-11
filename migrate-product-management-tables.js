import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

async function migrateTable(tableName, selectFields = '*') {
  console.log(`\n📦 Migrating ${tableName}...`);

  try {
    // Fetch data from old database
    const { data: oldData, error: fetchError } = await oldDb
      .from(tableName)
      .select(selectFields);

    if (fetchError) {
      console.error(`  ❌ Error fetching from old DB: ${fetchError.message}`);
      return { success: false, error: fetchError };
    }

    if (!oldData || oldData.length === 0) {
      console.log(`  ⚠️  No data found in old database`);
      return { success: true, count: 0 };
    }

    console.log(`  📥 Found ${oldData.length} rows in old database`);

    // Insert data into new database
    const { data: insertedData, error: insertError } = await newDb
      .from(tableName)
      .upsert(oldData, { onConflict: 'id' });

    if (insertError) {
      console.error(`  ❌ Error inserting into new DB: ${insertError.message}`);
      return { success: false, error: insertError };
    }

    console.log(`  ✅ Successfully migrated ${oldData.length} rows`);
    return { success: true, count: oldData.length };

  } catch (error) {
    console.error(`  ❌ Unexpected error: ${error.message}`);
    return { success: false, error };
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATING PRODUCT MANAGEMENT TABLES                             ║');
  console.log('║  From: igqlyqbhbqmxcksiuzix.supabase.co                         ║');
  console.log('║  To:   gxfclamonevgxmdqexzs.supabase.co                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  const results = {};

  // Step 1: Migrate product_attribute_templates (foundational)
  console.log('\n\n=== STEP 1: PRODUCT ATTRIBUTE TEMPLATES ===');
  results.product_attribute_templates = await migrateTable('product_attribute_templates');

  // Step 2: Migrate organization_settings
  console.log('\n\n=== STEP 2: ORGANIZATION SETTINGS ===');
  results.organization_settings = await migrateTable('organization_settings');

  // Step 3: Migrate integration_attribute_mappings
  console.log('\n\n=== STEP 3: INTEGRATION ATTRIBUTE MAPPINGS ===');
  results.integration_attribute_mappings = await migrateTable('integration_attribute_mappings');

  // Step 4: Migrate product_categories
  console.log('\n\n=== STEP 4: PRODUCT CATEGORIES ===');
  results.product_categories = await migrateTable('product_categories');

  // Step 5: Migrate products
  console.log('\n\n=== STEP 5: PRODUCTS ===');
  results.products = await migrateTable('products');

  // Step 6: Migrate product_category_assignments
  console.log('\n\n=== STEP 6: PRODUCT CATEGORY ASSIGNMENTS ===');
  results.product_category_assignments = await migrateTable('product_category_assignments');

  // Step 7: Migrate qu_locations
  console.log('\n\n=== STEP 7: QU LOCATIONS ===');
  results.qu_locations = await migrateTable('qu_locations');

  // Step 8: Migrate integration_sync_history
  console.log('\n\n=== STEP 8: INTEGRATION SYNC HISTORY ===');
  results.integration_sync_history = await migrateTable('integration_sync_history');

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION SUMMARY                                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let totalMigrated = 0;
  let successCount = 0;
  let failCount = 0;

  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    const count = result.count || 0;
    console.log(`${status} ${table.padEnd(45)} ${count} rows`);

    if (result.success) {
      successCount++;
      totalMigrated += count;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`Total rows migrated: ${totalMigrated}`);
  console.log(`Tables succeeded: ${successCount}/${Object.keys(results).length}`);
  console.log(`Tables failed: ${failCount}/${Object.keys(results).length}`);
  console.log('─'.repeat(70) + '\n');

  if (failCount > 0) {
    console.log('⚠️  Some tables failed to migrate. Check errors above.');
    process.exit(1);
  } else {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('\n\n❌ Fatal error:', err);
  process.exit(1);
});
