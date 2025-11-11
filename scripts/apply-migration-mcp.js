#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filename = process.argv[2];

if (!filename) {
  console.error('Usage: node apply-migration-mcp.js <filename.sql>');
  console.error('Example: node apply-migration-mcp.js 20251111_add_new_column.sql');
  console.log('\nThis script displays migration content for manual application via MCP tools.');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const filepath = path.join(migrationsDir, filename);

if (!fs.existsSync(filepath)) {
  console.error(`❌ Migration file not found: ${filename}`);
  process.exit(1);
}

const content = fs.readFileSync(filepath, 'utf8');
const version = filename.replace('.sql', '');

console.log('\n🔧 MIGRATION READY FOR MCP APPLICATION');
console.log('=====================================\n');
console.log(`📄 File: ${filename}`);
console.log(`🔑 Version: ${version}`);
console.log('\n📋 Use this with mcp__supabase__apply_migration:\n');
console.log('Filename:', version);
console.log('\nContent:');
console.log('---START---');
console.log(content);
console.log('---END---\n');
console.log('=====================================\n');
