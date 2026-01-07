const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function validate() {
  console.log('\n🔍 Validating CCGS Import\n');
  console.log('='.repeat(60));

  try {
    // Count concepts
    const { count: conceptsCount, error: conceptsError } = await supabase
      .from('concepts')
      .select('*', { count: 'exact', head: true })
      .not('ccgs_key', 'is', null);

    if (conceptsError) throw conceptsError;

    // Count companies
    const { count: companiesCount, error: companiesError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .not('ccgs_key', 'is', null);

    if (companiesError) throw companiesError;

    // Count stores
    const { count: storesCount, error: storesError } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .not('ccgs_key', 'is', null);

    if (storesError) throw storesError;

    // Display results
    const conceptsStatus = conceptsCount === 192 ? '✅' : conceptsCount > 0 ? '⚠️' : '❌';
    const companiesStatus = companiesCount === 1395 ? '✅' : companiesCount > 0 ? '⚠️' : '❌';
    const storesStatus = storesCount === 4572 ? '✅' : storesCount > 0 ? '⚠️' : '❌';

    console.log(`${conceptsStatus} Concepts: ${conceptsCount} / 192 expected`);
    console.log(`${companiesStatus} Companies: ${companiesCount} / 1,395 expected`);
    console.log(`${storesStatus} Stores: ${storesCount} / 4,572 expected`);

    const total = conceptsCount + companiesCount + storesCount;
    const expected = 192 + 1395 + 4572;

    console.log('='.repeat(60));
    console.log(`Total: ${total} / ${expected} records`);

    if (total === expected) {
      console.log('\n🎉 All CCGS data imported successfully!\n');
    } else if (total === 0) {
      console.log('\n⚠️  No CCGS data found.');
      console.log('Import the SQL files using Supabase Dashboard:\n');
      console.log('  1. Open Supabase Dashboard → Database → SQL Editor');
      console.log('  2. Copy contents of ccgs_import_final.sql');
      console.log('  3. Paste and run\n');
    } else {
      console.log('\n⚠️  Partial import detected.');
      console.log(`Missing: ${expected - total} records`);
      console.log('You can re-run the import - it will fill in gaps.\n');
    }

  } catch (error) {
    console.error('\n❌ Validation error:', error.message);
    process.exit(1);
  }
}

validate();
