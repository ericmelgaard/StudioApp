import fs from 'fs';
import path from 'path';

const migrationsDir = './supabase/migrations';

// Get all migration files sorted by timestamp
const allFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`Found ${allFiles.length} migrations to apply\n`);

// Output the migration commands for MCP
for (const migration of allFiles) {
  const migrationPath = path.join(migrationsDir, migration);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Skip empty migrations
  const sqlWithoutComments = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();
  if (!sqlWithoutComments) {
    console.log(`Skipping empty: ${migration}`);
    continue;
  }

  // Extract a safe filename (remove extension and use snake_case)
  const filename = migration.replace('.sql', '');

  console.log(`Migration: ${filename}`);
}

console.log(`\nTotal migrations to apply: ${allFiles.length}`);
console.log('\nTo apply these, use the Supabase CLI or run the SQL files directly in the Supabase dashboard.');
