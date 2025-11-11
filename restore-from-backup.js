import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const backupDir = process.argv[2];
if (!backupDir) {
  console.error('❌ Please provide backup directory as argument');
  console.log('Usage: node restore-from-backup.js <backup-directory>');
  process.exit(1);
}

console.log('Starting database restore...');
console.log(`Database: ${supabaseUrl}`);
console.log(`Backup source: ${backupDir}\n`);

// Import order matters - parent tables before child tables
const importOrder = [
  'concepts',
  'companies',
  'stores',
  'user_profiles',
  'placement_groups',
  'product_templates',
  'wand_templates',
  'wand_attributes',
  'wand_integration_sources',
  'integration_sources',
  'integration_source_configs',
  'integration_api_templates',
  'integration_formatters',
  'integration_products',
  'integration_modifiers',
  'integration_discounts',
  'products',
  'wand_products',
  'product_assignments',
  'template_assignments',
  'audit_logs'
];

async function restoreTable(tableName) {
  const filePath = join(backupDir, `${tableName}.json`);

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));

    if (data.length === 0) {
      console.log(`⊘ ${tableName}: No data to restore`);
      return { table: tableName, count: 0, success: true };
    }

    console.log(`Restoring ${tableName}... (${data.length} records)`);

    // Insert in batches of 100 to avoid payload limits
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const { error } = await supabase
        .from(tableName)
        .insert(batch);

      if (error) {
        console.error(`  ❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
        return { table: tableName, count: totalInserted, success: false, error: error.message };
      }

      totalInserted += batch.length;
      process.stdout.write(`  Progress: ${totalInserted}/${data.length}\r`);
    }

    console.log(`✓ ${tableName}: Restored ${totalInserted} records`);
    return { table: tableName, count: totalInserted, success: true };

  } catch (error) {
    console.error(`❌ ${tableName}:`, error.message);
    return { table: tableName, count: 0, success: false, error: error.message };
  }
}

async function restore() {
  const results = [];
  let totalRecords = 0;

  for (const tableName of importOrder) {
    const result = await restoreTable(tableName);
    results.push(result);
    if (result.success) {
      totalRecords += result.count;
    }
  }

  console.log('\n============================================================');
  console.log('RESTORE COMPLETE');
  console.log('============================================================');
  console.log(`Total records restored: ${totalRecords}\n`);

  console.log('Records per table:');
  results.forEach(r => {
    if (r.count > 0) {
      console.log(`  - ${r.table}: ${r.count}`);
    }
  });

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n⚠️  Tables with errors:');
    failures.forEach(f => {
      console.log(`  - ${f.table}: ${f.error}`);
    });
  }
}

restore().catch(console.error);
