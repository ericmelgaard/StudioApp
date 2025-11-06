import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function importLocations() {
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
        if (seen.has(item.key)) {
          return false;
        }
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

    console.log(`Found ${data.concepts.length} concepts`);
    console.log(`Found ${data.companies.length} companies`);
    console.log(`Found ${data.groups.length} groups`);
    console.log(`Found ${data.stores.length} stores`);

    console.log('\nImporting concepts...');
    const conceptsData = data.concepts.map(c => ({
      id: c.key,
      name: c.name,
      privilege_level: c.privilegeLevel,
      parent_level: c.parentLevel,
      domain_level: c.domainLevel,
      group_type_string: c.groupTypeString,
      parent_key: c.parentKey,
    }));

    const { error: conceptsError } = await supabase
      .from('concepts')
      .upsert(conceptsData, { onConflict: 'id' });

    if (conceptsError) {
      console.error('Error importing concepts:', conceptsError);
      throw conceptsError;
    }
    console.log(`✓ Imported ${conceptsData.length} concepts`);

    console.log('\nImporting companies...');
    const companiesData = data.companies.map(c => ({
      id: c.key,
      name: c.name,
      concept_id: c.parentKey,
      privilege_level: c.privilegeLevel,
      parent_level: c.parentLevel,
      domain_level: c.domainLevel,
      group_type_string: c.groupTypeString,
      parent_key: c.parentKey,
    }));

    const { error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });

    if (companiesError) {
      console.error('Error importing companies:', companiesError);
      throw companiesError;
    }
    console.log(`✓ Imported ${companiesData.length} companies`);

    console.log('\nMapping stores to companies...');
    const validCompanyIds = new Set(companiesData.map(c => c.id));
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
    const storesWithoutCompany = storesData.filter(s => s.company_id === null);

    console.log(`Stores with valid company mapping: ${storesWithCompany.length}`);
    console.log(`Stores without company mapping (skipped): ${storesWithoutCompany.length}`);

    console.log('\nImporting stores...');
    const { error: storesError } = await supabase
      .from('stores')
      .upsert(storesWithCompany, { onConflict: 'id' });

    if (storesError) {
      console.error('Error importing stores:', storesError);
      throw storesError;
    }
    console.log(`✓ Imported ${storesWithCompany.length} stores`);

    console.log('\n✅ Import complete!');
    console.log('Summary:');
    console.log(`  - ${conceptsData.length} concepts`);
    console.log(`  - ${companiesData.length} companies`);
    console.log(`  - ${storesWithCompany.length} stores`);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

importLocations();
