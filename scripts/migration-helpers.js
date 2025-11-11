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
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function getAppliedMigrations() {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version')
    .order('version', { ascending: true });

  if (error) {
    console.error('Error fetching migrations:', error);
    return [];
  }

  return data.map(m => m.version);
}

export async function getCurrentDatabaseUrl() {
  return supabaseUrl;
}

export async function verifyEnvironmentStability() {
  const envFile = path.join(__dirname, '..', '.env');
  const currentUrl = process.env.VITE_SUPABASE_URL;
  const currentKey = process.env.VITE_SUPABASE_ANON_KEY;

  const envContent = fs.readFileSync(envFile, 'utf8');
  const envUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
  const envKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

  return {
    stable: currentUrl === envUrl && currentKey === envKey,
    currentUrl,
    envUrl,
    matches: currentUrl === envUrl
  };
}

export async function getDatabaseSchema() {
  const { data: tables, error: tablesError } = await supabase.rpc('get_tables_info', {}, { count: 'exact' }).catch(async () => {
    const query = `
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql: query }).catch(async () => {
      return { data: null, error: null };
    });

    return { data, error };
  });

  return tables || [];
}

export function generateMigrationFilename(description) {
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');

  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${timestamp}_${slug}.sql`;
}

export function createMigrationTemplate(description, operations) {
  const template = `/*
  # ${description}

  1. Changes
${operations.map((op, i) => `    ${i + 1}. ${op}`).join('\n')}

  2. Security
    - Maintains existing RLS policies
    - No data loss (additive changes only)
*/

-- Add your SQL here
-- Example: ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name type;

`;

  return template;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'verify-env') {
    const result = await verifyEnvironmentStability();
    console.log('\nEnvironment Verification:');
    console.log('========================');
    console.log('Stable:', result.stable ? '✓ YES' : '✗ NO');
    console.log('Current URL:', result.currentUrl);
    console.log('Env File URL:', result.envUrl);
    console.log('Match:', result.matches ? '✓' : '✗');
  } else if (command === 'list-applied') {
    const migrations = await getAppliedMigrations();
    console.log('\nApplied Migrations:');
    console.log('==================');
    migrations.forEach(m => console.log(`  ${m}`));
    console.log(`\nTotal: ${migrations.length} migrations applied`);
  } else if (command === 'new') {
    const description = process.argv[3];
    if (!description) {
      console.error('Usage: node migration-helpers.js new "description of change"');
      process.exit(1);
    }

    const filename = generateMigrationFilename(description);
    const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
    const content = createMigrationTemplate(description, [
      'Describe your change here'
    ]);

    fs.writeFileSync(filepath, content);
    console.log(`\nCreated new migration: ${filename}`);
    console.log(`Location: ${filepath}`);
  } else {
    console.log('Usage:');
    console.log('  node migration-helpers.js verify-env    - Check environment stability');
    console.log('  node migration-helpers.js list-applied  - List applied migrations');
    console.log('  node migration-helpers.js new "desc"    - Create new migration file');
  }
}
