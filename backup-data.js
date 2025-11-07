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
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
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

  // Save as JSON
  fs.writeFileSync(
    filename,
    JSON.stringify(allData, null, 2),
    'utf8'
  );

  console.log(`✓ Saved ${allData.length} records to ${filename}`);
  return allData.length;
}

async function createSQLBackup(tableName, data, filename) {
  if (!data || data.length === 0) return;

  const columns = Object.keys(data[0]);
  let sql = `-- Backup of ${tableName} table\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Records: ${data.length}\n\n`;

  data.forEach(row => {
    const values = columns.map(col => {
      const val = row[col];
      if (val === null) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      return val;
    });

    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
  });

  fs.writeFileSync(filename, sql, 'utf8');
  console.log(`✓ Saved SQL backup to ${filename}`);
}

async function main() {
  console.log('Starting database backup...');
  console.log('Database:', process.env.VITE_SUPABASE_URL);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = `backup-${timestamp}`;

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  console.log(`\nBackup directory: ${backupDir}/`);

  // Backup concepts
  const conceptsFile = `${backupDir}/concepts.json`;
  const conceptsData = await backupTable('concepts', conceptsFile);

  // Backup companies
  const companiesFile = `${backupDir}/companies.json`;
  const companiesData = await backupTable('companies', companiesFile);

  // Backup stores
  const storesFile = `${backupDir}/stores.json`;
  const storesData = await backupTable('stores', storesFile);

  // Create SQL backups
  console.log('\nCreating SQL backups...');
  const conceptsJson = JSON.parse(fs.readFileSync(conceptsFile, 'utf8'));
  await createSQLBackup('concepts', conceptsJson, `${backupDir}/concepts.sql`);

  const companiesJson = JSON.parse(fs.readFileSync(companiesFile, 'utf8'));
  await createSQLBackup('companies', companiesJson, `${backupDir}/companies.sql`);

  const storesJson = JSON.parse(fs.readFileSync(storesFile, 'utf8'));
  await createSQLBackup('stores', storesJson, `${backupDir}/stores.sql`);

  // Create summary
  const summary = {
    timestamp: new Date().toISOString(),
    database: process.env.VITE_SUPABASE_URL,
    tables: {
      concepts: conceptsData,
      companies: companiesData,
      stores: storesData
    },
    total_records: conceptsData + companiesData + storesData
  };

  fs.writeFileSync(
    `${backupDir}/backup-summary.json`,
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log('\n' + '='.repeat(50));
  console.log('BACKUP COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total records backed up: ${summary.total_records}`);
  console.log(`  - Concepts: ${conceptsData}`);
  console.log(`  - Companies: ${companiesData}`);
  console.log(`  - Stores: ${storesData}`);
  console.log(`\nBackup location: ${backupDir}/`);
  console.log('\nFiles created:');
  console.log(`  - concepts.json & concepts.sql`);
  console.log(`  - companies.json & companies.sql`);
  console.log(`  - stores.json & stores.sql`);
  console.log(`  - backup-summary.json`);
}

main().catch(console.error);
