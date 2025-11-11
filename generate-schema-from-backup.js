import fs from 'fs';
import path from 'path';

const backupDir = 'backup-complete-2025-11-11T17-10-42';

const tables = [
  'concepts',
  'companies',
  'stores',
  'user_profiles',
  'placement_groups',
  'product_templates',
  'wand_integration_sources',
  'integration_source_configs',
  'integration_products',
  'integration_modifiers',
  'integration_discounts',
  'integration_formatters'
];

console.log('-- Schema generated from backup data\n');

for (const table of tables) {
  const filePath = path.join(backupDir, `${table}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (data.length === 0) {
    console.log(`-- ${table}: No data to analyze\n`);
    continue;
  }

  const firstRecord = data[0];
  const columns = Object.keys(firstRecord);

  console.log(`-- Table: ${table}`);
  console.log(`-- Columns found: ${columns.join(', ')}`);
  console.log();
}
