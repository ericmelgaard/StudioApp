import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const ccgsData = JSON.parse(readFileSync('./src/data/CCGS list.js', 'utf-8'));

const targetConceptNames = [
  "Auntie Anne's",
  "Church's Chicken",
  "Compass Group USA",
  "Compass USA: Bon Appetit",
  "Compass USA: Canteen",
  "Compass USA: Chartwells",
  "Compass USA: Eurest",
  "WAND Development",
  "Wand Sales (Internal)",
  "WAND Demos",
  "Cinnabon"
];

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function importData() {
  console.log('🔍 Filtering CCGS data for 11 selected concepts...\n');

  const selectedConcepts = ccgsData.concepts.filter(c =>
    targetConceptNames.includes(c.name)
  );

  const conceptKeys = new Set(selectedConcepts.map(c => c.key));
  const selectedCompanies = ccgsData.companies.filter(co =>
    conceptKeys.has(co.parentKey)
  );

  const companyIds = new Set(selectedCompanies.map(c => c.key));
  const selectedStores = ccgsData.stores.filter(s =>
    conceptKeys.has(s.grandParentKey) && companyIds.has(s.parentKey)
  );

  console.log('📊 Data to import:');
  console.log(`   Concepts: ${selectedConcepts.length}`);
  console.log(`   Companies: ${selectedCompanies.length}`);
  console.log(`   Stores: ${selectedStores.length}\n`);

  // Import concepts using raw SQL
  console.log('🚀 Importing concepts...');
  const conceptValues = selectedConcepts.map(c =>
    `(${c.key}, ${escapeSql(c.name)}, ${c.privilegeLevel}, ${c.parentLevel}, ${c.domainLevel}, ${escapeSql(c.groupTypeString)}, ${c.parentKey})`
  ).join(',\n');

  const conceptSql = `INSERT INTO concepts (id, name, privilege_level, parent_level, domain_level, group_type_string, parent_key)
    VALUES ${conceptValues}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;

  const { error: conceptError } = await supabase.rpc('exec_sql', { sql: conceptSql });
  if (conceptError) {
    console.error('❌ Error importing concepts:', conceptError);
    return;
  }
  console.log(`✅ Imported ${selectedConcepts.length} concepts\n`);

  // Import companies in batches
  console.log('🚀 Importing companies...');
  const batchSize = 50;
  for (let i = 0; i < selectedCompanies.length; i += batchSize) {
    const batch = selectedCompanies.slice(i, i + batchSize);
    const companyValues = batch.map(co =>
      `(${co.key}, ${escapeSql(co.name)}, ${co.parentKey}, ${co.privilegeLevel}, ${co.parentLevel}, ${co.domainLevel}, ${escapeSql(co.groupTypeString)}, ${co.parentKey})`
    ).join(',\n');

    const companySql = `INSERT INTO companies (id, name, concept_id, privilege_level, parent_level, domain_level, group_type_string, parent_key)
      VALUES ${companyValues}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;

    const { error } = await supabase.rpc('exec_sql', { sql: companySql });
    if (error) {
      console.error(`❌ Error importing companies batch ${Math.floor(i / batchSize) + 1}:`, error);
      return;
    }
    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} companies`);
  }
  console.log(`✅ Imported ${selectedCompanies.length} companies\n`);

  // Import stores in batches
  console.log('🚀 Importing stores...');
  for (let i = 0; i < selectedStores.length; i += batchSize) {
    const batch = selectedStores.slice(i, i + batchSize);
    const storeValues = batch.map(s =>
      `(${s.key}, ${escapeSql(s.name)}, ${s.parentKey}, ${s.privilegeLevel}, ${s.parentLevel}, ${s.domainLevel}, ${escapeSql(s.groupTypeString)}, ${s.parentKey}, ${s.grandParentKey || 'NULL'})`
    ).join(',\n');

    const storeSql = `INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key)
      VALUES ${storeValues}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;

    const { error } = await supabase.rpc('exec_sql', { sql: storeSql });
    if (error) {
      console.error(`❌ Error importing stores batch ${Math.floor(i / batchSize) + 1}:`, error);
      return;
    }
    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} stores`);
  }
  console.log(`✅ Imported ${selectedStores.length} stores\n`);

  console.log('✅ Import complete! All 11 concepts with their companies and stores are in the persistent database.');
  console.log('   Database: https://bejvcooiowueeexntzfl.supabase.co');
}

importData().catch(console.error);
