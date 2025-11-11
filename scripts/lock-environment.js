#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const envPath = path.join(__dirname, '..', '.env');
const lockPath = path.join(__dirname, '..', '.env.lock');

const command = process.argv[2];

if (command === 'create') {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const url = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
  const key = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

  if (!url || !key) {
    console.error('❌ Invalid .env file format');
    process.exit(1);
  }

  const lockData = {
    url,
    keyHash: hashString(key),
    timestamp: new Date().toISOString(),
    note: 'This file locks your database URL. If this URL changes, manual intervention is required.'
  };

  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  console.log('✅ Environment locked!');
  console.log(`📍 Database URL: ${url}`);
  console.log(`📅 Timestamp: ${lockData.timestamp}`);
  console.log(`\n⚠️  If you need to change databases, delete .env.lock and recreate it.`);

} else if (command === 'verify') {
  if (!fs.existsSync(lockPath)) {
    console.log('⚠️  No environment lock found. Run: node lock-environment.js create');
    process.exit(0);
  }

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const envContent = fs.readFileSync(envPath, 'utf8');
  const currentUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
  const currentKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

  console.log('\n🔒 ENVIRONMENT LOCK VERIFICATION');
  console.log('=====================================\n');
  console.log(`Locked URL: ${lockData.url}`);
  console.log(`Current URL: ${currentUrl}`);
  console.log(`Lock Date: ${lockData.timestamp}\n`);

  if (currentUrl !== lockData.url) {
    console.error('❌ ENVIRONMENT MISMATCH DETECTED!');
    console.error('The database URL has changed from the locked value.');
    console.error('This indicates an unauthorized database switch.\n');
    console.error('Actions:');
    console.error('  1. If intentional: Delete .env.lock and recreate it');
    console.error('  2. If unintentional: Restore the correct .env file\n');
    process.exit(1);
  }

  const currentKeyHash = hashString(currentKey);
  if (currentKeyHash !== lockData.keyHash) {
    console.warn('⚠️  Anon key has changed (possibly regenerated)');
    console.warn('URL is correct, but the key changed. This may be intentional.\n');
  }

  console.log('✅ Environment is stable and matches lock');
  console.log('=====================================\n');

} else if (command === 'info') {
  if (!fs.existsSync(lockPath)) {
    console.log('No environment lock exists.');
    process.exit(0);
  }

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  console.log('\n📋 LOCK INFORMATION');
  console.log('=====================================');
  console.log(JSON.stringify(lockData, null, 2));
  console.log('=====================================\n');

} else {
  console.log('Environment Lock Tool');
  console.log('====================\n');
  console.log('Usage:');
  console.log('  node lock-environment.js create   - Lock current environment');
  console.log('  node lock-environment.js verify   - Verify environment matches lock');
  console.log('  node lock-environment.js info     - Show lock information\n');
  console.log('Purpose:');
  console.log('  Prevents accidental database URL changes that cause data loss.\n');
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
