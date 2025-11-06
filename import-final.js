import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function importData() {
  try {
    console.log('Reading location data...');
    const dataPath = path.join(__dirname, 'src', 'data', 'CCGS list.js');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');

    const jsonMatch = fileContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from file');
    }

    const data = JSON.parse(jsonMatch[0]);

    const deduplicateByKey = (array) => {
      const seen = new Map();
      return array.filter(item => {
        if (seen.has(item.key)) return false;
        seen.set(item.key, true);
        return true;
      });
    };

    data.concepts = deduplicateByKey(data.concepts);
    data.companies = deduplicateByKey(data.companies);
    data.groups = deduplicateByKey(data.groups);
    data.stores = deduplicateByKey(data.stores);

    const conceptKeys = new Set(data.concepts.map(c => c.key));
    data.companies = data.companies.filter(c => conceptKeys.has(c.parentKey));

    console.log(`\nData loaded:`);
    console.log(`  Concepts: ${data.concepts.length}`);
    console.log(`  Companies: ${data.companies.length}`);
    console.log(`  Groups: ${data.groups.length}`);
    console.log(`  Stores: ${data.stores.length}`);

    // Check current counts
    const { count: existingConcepts } = await supabase.from('concepts').select('*', { count: 'exact', head: true });
    console.log(`\n✓ Concepts already in DB: ${existingConcepts}`);

    // Import companies in batches of 200
    console.log(`\nImporting companies in batches...`);
    const batchSize = 200;
    const companyValues = data.companies.map(c =>
      `(${c.key}, ${escapeSql(c.name)}, ${c.parentKey}, ${c.privilegeLevel}, ${c.parentLevel}, ${c.domainLevel}, ${escapeSql(c.groupTypeString)}, ${c.parentKey})`
    );

    for (let i = 0; i < companyValues.length; i += batchSize) {
      const batch = companyValues.slice(i, Math.min(i + batchSize, companyValues.length));
      const sql = `INSERT INTO companies (id, name, concept_id, privilege_level, parent_level, domain_level, group_type_string, parent_key) VALUES ${batch.join(', ')} ON CONFLICT (id) DO NOTHING;`;

      const { error } = await supabase.rpc('query_db', { query_text: sql }).maybeSingle();
      if (error) {
        // Try direct execute_sql
        const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
          console.error(`\nBatch ${i}-${i+batch.length} failed`);
          console.error('Error:', error);
          throw new Error('Failed to insert companies batch');
        }
      }

      process.stdout.write(`\r  Companies: ${Math.min(i + batchSize, companyValues.length)}/${companyValues.length}`);
    }
    console.log(` ✓`);

    const { count: companiesCount } = await supabase.from('companies').select('*', { count: 'exact', head: true });
    console.log(`  Verified: ${companiesCount} companies in DB`);

    // Map and import stores
    console.log(`\nMapping stores to companies...`);
    const validCompanyIds = new Set(data.companies.map(c => c.key));
    const groupToCompany = new Map();
    data.groups.forEach(g => {
      groupToCompany.set(g.key, g.parentKey);
    });

    const storesData = data.stores.map(s => {
      let companyId = null;
      if (validCompanyIds.has(s.parentKey)) {
        companyId = s.parentKey;
      } else if (groupToCompany.has(s.parentKey)) {
        const companyViaGroup = groupToCompany.get(s.parentKey);
        if (companyViaGroup && validCompanyIds.has(companyViaGroup)) {
          companyId = companyViaGroup;
        }
      }
      return {
        id: s.key,
        name: s.name,
        company_id: companyId,
        privilege_level: s.privilegeLevel,
        parent_level: s.parentLevel,
        domain_level: s.domainLevel,
        group_type_string: s.groupTypeString,
        parent_key: s.parentKey,
        grand_parent_key: s.grandParentKey,
      };
    });

    const storesWithCompany = storesData.filter(s => s.company_id !== null);
    console.log(`  Stores with valid company: ${storesWithCompany.length}`);
    console.log(`  Stores without company (skipped): ${storesData.length - storesWithCompany.length}`);

    console.log(`\nImporting stores in batches...`);
    const storeValues = storesWithCompany.map(s =>
      `(${s.id}, ${escapeSql(s.name)}, ${s.company_id}, ${s.privilege_level}, ${s.parent_level}, ${s.domain_level}, ${escapeSql(s.group_type_string)}, ${s.parent_key}, ${s.grand_parent_key || 'NULL'})`
    );

    for (let i = 0; i < storeValues.length; i += batchSize) {
      const batch = storeValues.slice(i, Math.min(i + batchSize, storeValues.length));
      const sql = `INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key) VALUES ${batch.join(', ')} ON CONFLICT (id) DO NOTHING;`;

      const { error } = await supabase.rpc('query_db', { query_text: sql }).maybeSingle();
      if (error) {
        const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
          console.error(`\nBatch ${i}-${i+batch.length} failed`);
          throw new Error('Failed to insert stores batch');
        }
      }

      process.stdout.write(`\r  Stores: ${Math.min(i + batchSize, storeValues.length)}/${storeValues.length}`);
    }
    console.log(` ✓`);

    const { count: storesCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
    console.log(`  Verified: ${storesCount} stores in DB`);

    console.log(`\n✅ Import Complete!`);
    console.log(`\nFinal Database Counts:`);
    console.log(`  📊 Concepts: ${existingConcepts}`);
    console.log(`  🏢 Companies: ${companiesCount}`);
    console.log(`  🏪 Stores: ${storesCount}`);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

importData();
