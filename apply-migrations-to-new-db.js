import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Starting migration process...');
console.log(`📍 Target database: ${supabaseUrl}\n`);

const migrationsDir = './supabase/migrations';

// Get all migration files sorted by timestamp
const allFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`📁 Found ${allFiles.length} migration files\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const migration of allFiles) {
  const migrationPath = path.join(migrationsDir, migration);

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Skip if it's just comments
    const sqlWithoutComments = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();
    if (!sqlWithoutComments) {
      console.log(`⊘ Skipping ${migration} (empty/comments only)`);
      skipCount++;
      continue;
    }

    process.stdout.write(`⏳ Applying ${migration}...`);

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Check if it's a "already exists" error which we can safely ignore
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log(` ⊘ (already exists)`);
        skipCount++;
      } else {
        console.log(` ❌`);
        console.error(`  Error: ${error.message || JSON.stringify(error)}`);
        errorCount++;

        // Don't exit on error, continue with next migration
        // This allows partial schema to be created even if some migrations fail
      }
    } else {
      console.log(` ✓`);
      successCount++;
    }

  } catch (err) {
    console.log(` ❌`);
    console.error(`  Error reading/parsing: ${err.message}`);
    errorCount++;
  }
}

console.log('\n============================================================');
console.log('MIGRATION SUMMARY');
console.log('============================================================');
console.log(`✓ Successfully applied: ${successCount}`);
console.log(`⊘ Skipped: ${skipCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`📊 Total: ${allFiles.length}`);

if (errorCount > 0) {
  console.log('\n⚠️  Some migrations failed. Check errors above.');
  console.log('   You may need to apply failed migrations manually.');
} else {
  console.log('\n🎉 All migrations applied successfully!');
}
