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

async function applyMigration(filename) {
  console.log('\n🚀 APPLYING MIGRATION');
  console.log('=====================================\n');

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const filepath = path.join(migrationsDir, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ Migration file not found: ${filename}`);
    process.exit(1);
  }

  const version = filename.replace('.sql', '');

  const { data: existing } = await supabase
    .from('schema_migrations')
    .select('version')
    .eq('version', version)
    .single();

  if (existing) {
    console.log(`⚠️  Migration already applied: ${version}`);
    console.log('Skipping...\n');
    return;
  }

  console.log(`📄 File: ${filename}`);
  console.log(`📍 Database: ${supabaseUrl}`);

  const content = fs.readFileSync(filepath, 'utf8');

  console.log('\n📝 Migration Content Preview:');
  console.log('---');
  console.log(content.split('\n').slice(0, 20).join('\n'));
  if (content.split('\n').length > 20) {
    console.log('...');
  }
  console.log('---\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: content })
      .catch(() => ({ data: null, error: { message: 'RPC not available, using direct execution' }}));

    if (error && error.message.includes('RPC not available')) {
      console.log('⚠️  Direct SQL execution not available, using MCP tool...');
      console.log('Please use: apply-migration-mcp.js instead');
      process.exit(1);
    }

    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }

    const { error: insertError } = await supabase
      .from('schema_migrations')
      .insert({ version });

    if (insertError) {
      console.error('❌ Failed to record migration:', insertError.message);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log(`✓ Recorded in schema_migrations: ${version}\n`);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }

  console.log('=====================================\n');
}

const filename = process.argv[2];

if (!filename) {
  console.error('Usage: node apply-single-migration.js <filename.sql>');
  console.error('Example: node apply-single-migration.js 20251111_add_new_column.sql');
  process.exit(1);
}

applyMigration(filename).catch(console.error);
