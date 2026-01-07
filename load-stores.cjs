const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function loadStores() {
  console.log('\n📦 Loading Stores Data (4,572 records)\n');

  try {
    // Create temp table
    console.log('Creating temp table...');
    await supabase.rpc('execute_sql', {
      query: `CREATE TEMP TABLE IF NOT EXISTS temp_ccgs_stores (
        name text,
        ccgs_key bigint,
        privilege_level integer,
        parent_level integer,
        domain_level integer,
        group_type_string text,
        parent_key bigint,
        grand_parent_key bigint
      )`
    });

    // Load 8 batches
    for (let i = 1; i <= 8; i++) {
      console.log(`Loading batch ${i}/8...`);
      const batch = fs.readFileSync(`/tmp/stores_batch${i}.sql`, 'utf8');
      const insert = batch.substring(batch.indexOf('INSERT'));
      await supabase.rpc('execute_sql', { query: insert });
    }

    // Apply changes
    console.log('Applying updates and inserts...');
    const final = fs.readFileSync('/tmp/stores_batch_final.sql', 'utf8');
    await supabase.rpc('execute_sql', { query: final });

    console.log('✅ Stores import complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

loadStores();
