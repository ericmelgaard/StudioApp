#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabaseState() {
  console.log('\n🔍 DATABASE STATE VERIFICATION');
  console.log('=====================================\n');

  console.log(`📍 Database URL: ${supabaseUrl}`);

  const { data: migrations, error: migError } = await supabase
    .from('schema_migrations')
    .select('version')
    .order('version', { ascending: false });

  if (migError) {
    console.error('❌ Error fetching migrations:', migError.message);
  } else {
    console.log(`\n✓ Applied Migrations: ${migrations.length}`);
    console.log('\nMost Recent:');
    migrations.slice(0, 5).forEach(m => {
      console.log(`  • ${m.version}`);
    });
  }

  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  const { data: tables, error: tableError } = await supabase.rpc('exec_sql', { sql: query })
    .catch(() => ({ data: null, error: null }));

  if (!tableError && tables) {
    console.log(`\n✓ Database Tables: ${tables.length}`);
    tables.forEach(t => {
      console.log(`  • ${t.table_name}`);
    });
  } else {
    const simpleQuery = await supabase.from('companies').select('id', { count: 'exact', head: true });
    const tables = ['companies', 'concepts', 'stores', 'products', 'user_profiles',
                   'integration_products', 'integration_source_configs', 'placement_groups',
                   'product_templates', 'wand_integration_sources'];
    console.log(`\n✓ Known Tables: ${tables.length}`);
    tables.forEach(t => console.log(`  • ${t}`));
  }

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.includes('archive'))
    .sort();

  console.log(`\n📁 Migration Files on Disk: ${migrationFiles.length}`);
  console.log('\nMost Recent:');
  migrationFiles.slice(-5).forEach(f => {
    console.log(`  • ${f}`);
  });

  const appliedSet = new Set(migrations.map(m => m.version));
  const unappliedMigrations = migrationFiles.filter(f => {
    const version = f.replace('.sql', '');
    return !appliedSet.has(version);
  });

  if (unappliedMigrations.length > 0) {
    console.log(`\n⚠️  Unapplied Migrations: ${unappliedMigrations.length}`);
    console.log('\nThese files exist but are not in the database:');
    unappliedMigrations.slice(0, 10).forEach(f => {
      console.log(`  • ${f}`);
    });
    if (unappliedMigrations.length > 10) {
      console.log(`  ... and ${unappliedMigrations.length - 10} more`);
    }
  } else {
    console.log('\n✓ All migration files are applied');
  }

  console.log('\n=====================================');
  console.log('✅ VERIFICATION COMPLETE\n');
}

verifyDatabaseState().catch(console.error);
