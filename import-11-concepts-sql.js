import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

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

async function executeSql(query) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL Error: ${error}`);
  }

  return response.json();
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

  // Import concepts
  console.log('🚀 Importing concepts...');
  for (const c of selectedConcepts) {
    const sql = `INSERT INTO concepts (id, name, privilege_level, parent_level, domain_level, group_type_string, parent_key)
      VALUES (${c.key}, '${c.name.replace(/'/g, "''")}', ${c.privilegeLevel}, ${c.parentLevel}, ${c.domainLevel}, '${c.groupTypeString || ''}', ${c.parentKey})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;
    await executeSql(sql);
  }
  console.log(`✅ Imported ${selectedConcepts.length} concepts\n`);

  // Import companies in batches
  console.log('🚀 Importing companies...');
  const batchSize = 50;
  for (let i = 0; i < selectedCompanies.length; i += batchSize) {
    const batch = selectedCompanies.slice(i, i + batchSize);
    const values = batch.map(co =>
      `(${co.key}, '${co.name.replace(/'/g, "''")}', ${co.parentKey}, ${co.privilegeLevel}, ${co.parentLevel}, ${co.domainLevel}, '${co.groupTypeString || ''}', ${co.parentKey})`
    ).join(',\n');

    const sql = `INSERT INTO companies (id, name, concept_id, privilege_level, parent_level, domain_level, group_type_string, parent_key)
      VALUES ${values}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;

    await executeSql(sql);
    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} companies`);
  }
  console.log(`✅ Imported ${selectedCompanies.length} companies\n`);

  // Import stores in batches
  console.log('🚀 Importing stores...');
  for (let i = 0; i < selectedStores.length; i += batchSize) {
    const batch = selectedStores.slice(i, i + batchSize);
    const values = batch.map(s =>
      `(${s.key}, '${s.name.replace(/'/g, "''")}', ${s.parentKey}, ${s.privilegeLevel}, ${s.parentLevel}, ${s.domainLevel}, '${s.groupTypeString || ''}', ${s.parentKey}, ${s.grandParentKey || 'NULL'})`
    ).join(',\n');

    const sql = `INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key)
      VALUES ${values}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;

    await executeSql(sql);
    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} stores`);
  }
  console.log(`✅ Imported ${selectedStores.length} stores\n`);

  console.log('✅ Import complete! All 11 concepts with their companies and stores are in the persistent database.');
}

importData().catch(console.error);
