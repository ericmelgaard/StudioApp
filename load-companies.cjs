const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function loadCompanies() {
  console.log('\n📦 Loading Companies Data\n');

  try {
    // Create temp table
    console.log('Creating temp table...');
    await supabase.rpc('execute_sql', {
      query: `CREATE TEMP TABLE IF NOT EXISTS temp_ccgs_companies (
        name text,
        ccgs_key bigint,
        privilege_level integer,
        parent_level integer,
        domain_level integer,
        group_type_string text,
        parent_key bigint
      )`
    });

    // Load batch 1
    console.log('Loading batch 1/3...');
    const batch1 = fs.readFileSync('/tmp/companies_batch1.sql', 'utf8');
    const insert1 = batch1.substring(batch1.indexOf('INSERT'));
    await supabase.rpc('execute_sql', { query: insert1 });

    // Load batch 2
    console.log('Loading batch 2/3...');
    const batch2 = fs.readFileSync('/tmp/companies_batch2.sql', 'utf8');
    const insert2 = batch2.substring(batch2.indexOf('INSERT'));
    await supabase.rpc('execute_sql', { query: insert2 });

    // Load batch 3
    console.log('Loading batch 3/3...');
    const batch3 = fs.readFileSync('/tmp/companies_batch3.sql', 'utf8');
    const insert3 = batch3.substring(batch3.indexOf('INSERT'));
    await supabase.rpc('execute_sql', { query: insert3 });

    // Apply changes
    console.log('Applying updates and inserts...');
    const final = fs.readFileSync('/tmp/companies_batch_final.sql', 'utf8');
    await supabase.rpc('execute_sql', { query: final });

    console.log('✅ Companies import complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

loadCompanies();
