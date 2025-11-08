import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function backupTable(tableName, filename) {
  console.log(`\nBacking up ${tableName}...`);

  let allData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    console.log(`  Fetched ${allData.length} records...`);

    if (data.length < pageSize) break;
    page++;
  }

  fs.writeFileSync(
    filename,
    JSON.stringify(allData, null, 2),
    'utf8'
  );

  console.log(`✓ Saved ${allData.length} records to ${filename}`);
  return allData.length;
}

async function main() {
  console.log('Starting COMPLETE database backup...');
  console.log('Database:', process.env.VITE_SUPABASE_URL);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = `backup-complete-${timestamp}`;

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  console.log(`\nBackup directory: ${backupDir}/`);

  // All tables in your database
  const tables = [
    'concepts',
    'companies',
    'stores',
    'user_profiles',
    'placement_groups',
    'products',
    'product_templates',
    'product_assignments',
    'template_assignments',
    'wand_products',
    'wand_templates',
    'wand_attributes',
    'wand_integration_sources',
    'integration_sources',
    'integration_source_configs',
    'integration_products',
    'integration_modifiers',
    'integration_discounts',
    'integration_api_templates',
    'integration_formatters',
    'audit_logs'
  ];

  const results = {};
  let totalRecords = 0;

  for (const table of tables) {
    try {
      const count = await backupTable(table, `${backupDir}/${table}.json`);
      results[table] = count;
      totalRecords += count;
    } catch (err) {
      console.error(`Failed to backup ${table}:`, err.message);
      results[table] = 0;
    }
  }

  // Create summary
  const summary = {
    timestamp: new Date().toISOString(),
    database: process.env.VITE_SUPABASE_URL,
    tables: results,
    total_records: totalRecords
  };

  fs.writeFileSync(
    `${backupDir}/backup-summary.json`,
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log('\n' + '='.repeat(60));
  console.log('BACKUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total records backed up: ${totalRecords}`);
  console.log(`\nRecords per table:`);
  Object.entries(results).forEach(([table, count]) => {
    if (count > 0) {
      console.log(`  - ${table}: ${count}`);
    }
  });
  console.log(`\nBackup location: ${backupDir}/`);
}

main().catch(console.error);
