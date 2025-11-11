import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const migrationsDir = '/tmp/cc-agent/60040582/project/supabase/migrations';

async function getAllMigrations() {
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
    .sort(); // Chronological order by filename
  
  console.log('Found ' + files.length + ' migration files');
  return files;
}

async function main() {
  const migrations = await getAllMigrations();
  
  console.log('\nMigration files that will be applied:');
  migrations.forEach((m, i) => {
    console.log('  ' + (i+1) + '. ' + m);
  });
  
  console.log('\n\nNOTE: These need to be applied via Supabase MCP tool or SQL editor');
  console.log('The key migrations we need are:');
  console.log('  - 20251106222114_create_location_hierarchy_final.sql');
  console.log('  - 20251106020000_create_wand_integration_system.sql');
  console.log('  - 20251109152447_create_product_attribute_templates_table.sql');
  console.log('  - 20251109152523_create_organization_settings_table.sql');
  console.log('  - 20251109160245_create_integration_attribute_mappings.sql');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
