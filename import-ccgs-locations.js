import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const ccgsData = JSON.parse(readFileSync('./src/data/CCGS list.js', 'utf-8'));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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

async function importCCGSLocations() {
  try {
    console.log('🔍 Filtering CCGS data for selected concepts...\n');

    const selectedConcepts = ccgsData.concepts.filter(c =>
      targetConceptNames.includes(c.name)
    );

    const selectedKeys = selectedConcepts.map(c => c.key);

    const selectedCompanies = ccgsData.companies.filter(co =>
      selectedKeys.includes(co.parentKey)
    );

    const companyIds = new Set(selectedCompanies.map(c => c.key));

    const selectedStores = ccgsData.stores.filter(s =>
      selectedKeys.includes(s.grandParentKey) && companyIds.has(s.parentKey)
    );

    console.log('📊 Data Summary:');
    console.log(`   Concepts: ${selectedConcepts.length}`);
    console.log(`   Companies: ${selectedCompanies.length}`);
    console.log(`   Stores: ${selectedStores.length}\n`);

    console.log('📝 Selected Concepts:');
    selectedConcepts.forEach(c => {
      const companyCount = selectedCompanies.filter(co => co.parentKey === c.key).length;
      const storeCount = selectedStores.filter(s => s.grandParentKey === c.key).length;
      console.log(`   ${c.name.padEnd(40)} | Companies: ${companyCount.toString().padStart(3)} | Stores: ${storeCount.toString().padStart(4)}`);
    });
    console.log('');

    console.log('🚀 Step 1: Importing concepts...');
    const conceptsToInsert = selectedConcepts.map(c => ({
      id: c.key,
      name: c.name,
      privilege_level: c.privilegeLevel,
      parent_level: c.parentLevel,
      domain_level: c.domainLevel,
      group_type_string: c.groupTypeString || '',
      parent_key: c.parentKey
    }));

    const { data: conceptsData, error: conceptsError } = await supabase
      .from('concepts')
      .upsert(conceptsToInsert, { onConflict: 'id' })
      .select();

    if (conceptsError) {
      console.error('❌ Error importing concepts:', conceptsError);
      return;
    }

    console.log(`✅ Imported ${conceptsData.length} concepts\n`);

    console.log('🚀 Step 2: Importing companies in batches...');
    const companiesToInsert = selectedCompanies.map(co => ({
      id: co.key,
      name: co.name,
      concept_id: co.parentKey,
      privilege_level: co.privilegeLevel,
      parent_level: co.parentLevel,
      domain_level: co.domainLevel,
      group_type_string: co.groupTypeString || '',
      parent_key: co.parentKey
    }));

    const companyBatchSize = 150;
    let companiesImported = 0;

    for (let i = 0; i < companiesToInsert.length; i += companyBatchSize) {
      const batch = companiesToInsert.slice(i, i + companyBatchSize);

      const { data, error } = await supabase
        .from('companies')
        .upsert(batch, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`❌ Error importing companies batch ${Math.floor(i / companyBatchSize) + 1}:`, error);
        return;
      }

      companiesImported += data.length;
      console.log(`   Batch ${Math.floor(i / companyBatchSize) + 1}: ${data.length} companies imported (${companiesImported}/${companiesToInsert.length})`);
    }

    console.log(`✅ Imported ${companiesImported} companies\n`);

    console.log('🚀 Step 3: Importing stores in batches...');

    const storeKeyMap = new Map();
    selectedStores.forEach(s => {
      if (!storeKeyMap.has(s.key)) {
        storeKeyMap.set(s.key, s);
      } else {
        console.log(`   ⚠️  Duplicate key ${s.key}: ${s.name} (keeping first occurrence)`);
      }
    });

    console.log(`   Filtered ${selectedStores.length} stores down to ${storeKeyMap.size} unique stores (removed ${selectedStores.length - storeKeyMap.size} duplicates)\n`);

    const storesToInsert = Array.from(storeKeyMap.values()).map(s => ({
      id: s.key,
      name: s.name,
      company_id: s.parentKey,
      privilege_level: s.privilegeLevel,
      parent_level: s.parentLevel,
      domain_level: s.domainLevel,
      group_type_string: s.groupTypeString || '',
      parent_key: s.parentKey,
      grand_parent_key: s.grandParentKey
    }));

    const storeBatchSize = 200;
    let storesImported = 0;

    for (let i = 0; i < storesToInsert.length; i += storeBatchSize) {
      const batch = storesToInsert.slice(i, i + storeBatchSize);

      const { data, error } = await supabase
        .from('stores')
        .upsert(batch, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`❌ Error importing stores batch ${Math.floor(i / storeBatchSize) + 1}:`, error);
        return;
      }

      storesImported += data.length;
      console.log(`   Batch ${Math.floor(i / storeBatchSize) + 1}: ${data.length} stores imported (${storesImported}/${storesToInsert.length})`);
    }

    console.log(`✅ Imported ${storesImported} stores\n`);

    console.log('🔍 Verifying data integrity...');

    const { count: conceptCount } = await supabase
      .from('concepts')
      .select('*', { count: 'exact', head: true });

    const { count: companyCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    const { count: storeCount } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Database Counts:');
    console.log(`   Concepts: ${conceptCount}`);
    console.log(`   Companies: ${companyCount}`);
    console.log(`   Stores: ${storeCount}\n`);

    console.log('🔗 Testing sample hierarchy...');
    const { data: sampleStore } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        companies (
          id,
          name,
          concepts (
            id,
            name
          )
        )
      `)
      .limit(1)
      .single();

    if (sampleStore) {
      console.log('✅ Sample hierarchy chain:');
      console.log(`   Concept: ${sampleStore.companies.concepts.name} (ID: ${sampleStore.companies.concepts.id})`);
      console.log(`   Company: ${sampleStore.companies.name} (ID: ${sampleStore.companies.id})`);
      console.log(`   Store: ${sampleStore.name} (ID: ${sampleStore.id})\n`);
    }

    console.log('✅ Import completed successfully!');
    console.log('🎉 All 11 concepts with their companies and stores are now in Supabase.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

importCCGSLocations();
