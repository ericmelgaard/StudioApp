const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeQuery(sql, description) {
  console.log(`  ⏳ ${description}...`);
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error(`  ❌ Error: ${error.message}`);
    throw error;
  }

  console.log(`  ✓ ${description} complete`);
  return data;
}

async function applyMigration() {
  console.log('\n🚀 Applying CCGS Import to Database\n');
  console.log('=' .repeat(60));

  const sql = fs.readFileSync('./ccgs_import_final.sql', 'utf8');

  // Split into three main sections
  const conceptsMatch = sql.match(/CREATE TEMP TABLE temp_ccgs_concepts[\s\S]*?DROP TABLE temp_ccgs_concepts;/);
  const companiesMatch = sql.match(/CREATE TEMP TABLE temp_ccgs_companies[\s\S]*?DROP TABLE temp_ccgs_companies;/);
  const storesMatch = sql.match(/CREATE TEMP TABLE temp_ccgs_stores[\s\S]*?DROP TABLE temp_ccgs_stores;/);

  if (!conceptsMatch || !companiesMatch || !storesMatch) {
    console.error('❌ Could not parse SQL sections');
    process.exit(1);
  }

  try {
    console.log('\n📦 Importing Concepts (192 records)');
    await executeQuery(conceptsMatch[0], 'Concepts import');

    console.log('\n📦 Importing Companies (1,395 records)');
    await executeQuery(companiesMatch[0], 'Companies import');

    console.log('\n📦 Importing Stores (4,572 records)');
    await executeQuery(storesMatch[0], 'Stores import');

    console.log('\n' + '='.repeat(60));
    console.log('✅ CCGS Import Complete!\n');

    // Validate
    console.log('🔍 Validating import...\n');

    const { data: conceptsCount } = await supabase
      .from('concepts')
      .select('ccgs_key', { count: 'exact', head: true })
      .not('ccgs_key', 'is', null);

    const { data: companiesCount } = await supabase
      .from('companies')
      .select('ccgs_key', { count: 'exact', head: true })
      .not('ccgs_key', 'is', null);

    const { data: storesCount } = await supabase
      .from('stores')
      .select('ccgs_key', { count: 'exact', head: true })
      .not('ccgs_key', 'is', null);

    console.log(`  ✓ Concepts with ccgs_key: ${conceptsCount?.length || 'checking...'}`);
    console.log(`  ✓ Companies with ccgs_key: ${companiesCount?.length || 'checking...'}`);
    console.log(`  ✓ Stores with ccgs_key: ${storesCount?.length || 'checking...'}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
