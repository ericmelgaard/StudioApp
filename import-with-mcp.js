import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function generateImportSQL() {
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

    // Generate concepts SQL
    const conceptValues = data.concepts.map(c =>
      `(${c.key}, ${escapeSql(c.name)}, ${c.privilegeLevel}, ${c.parentLevel}, ${c.domainLevel}, ${escapeSql(c.groupTypeString)}, ${c.parentKey})`
    );
    const conceptsSQL = `INSERT INTO concepts (id, name, privilege_level, parent_level, domain_level, group_type_string, parent_key) VALUES\n${conceptValues.join(',\n')}\nON CONFLICT (id) DO NOTHING;`;
    fs.writeFileSync('/tmp/import_concepts.sql', conceptsSQL);
    console.log('✓ Generated concepts SQL');

    // Generate companies SQL
    const companyValues = data.companies.map(c =>
      `(${c.key}, ${escapeSql(c.name)}, ${c.parentKey}, ${c.privilegeLevel}, ${c.parentLevel}, ${c.domainLevel}, ${escapeSql(c.groupTypeString)}, ${c.parentKey})`
    );
    const companiesSQL = `INSERT INTO companies (id, name, concept_id, privilege_level, parent_level, domain_level, group_type_string, parent_key) VALUES\n${companyValues.join(',\n')}\nON CONFLICT (id) DO NOTHING;`;
    fs.writeFileSync('/tmp/import_companies.sql', companiesSQL);
    console.log('✓ Generated companies SQL');

    // Map stores to companies
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
    console.log(`Stores with valid company mapping: ${storesWithCompany.length}`);

    // Generate stores SQL
    const storeValues = storesWithCompany.map(s =>
      `(${s.id}, ${escapeSql(s.name)}, ${s.company_id}, ${s.privilege_level}, ${s.parent_level}, ${s.domain_level}, ${escapeSql(s.group_type_string)}, ${s.parent_key}, ${s.grand_parent_key || 'NULL'})`
    );
    const storesSQL = `INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key) VALUES\n${storeValues.join(',\n')}\nON CONFLICT (id) DO NOTHING;`;
    fs.writeFileSync('/tmp/import_stores.sql', storesSQL);
    console.log('✓ Generated stores SQL');

    console.log('\n✅ SQL files generated in /tmp/');
    console.log('Files:');
    console.log('  - /tmp/import_concepts.sql');
    console.log('  - /tmp/import_companies.sql');
    console.log('  - /tmp/import_stores.sql');
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
}

generateImportSQL();
