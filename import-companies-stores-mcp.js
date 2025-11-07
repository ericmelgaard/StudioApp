import { readFileSync, writeFileSync } from 'fs';

const ccgsData = JSON.parse(readFileSync('./src/data/CCGS list.js', 'utf-8'));

const conceptIds = [54, 17, 50, 199, 266, 268, 232, 316, 214, 73, 209];

// Get companies for these concepts
const companies = ccgsData.companies.filter(co => conceptIds.includes(co.parentKey));

// Get stores for these companies
const companyIds = new Set(companies.map(c => c.key));
const stores = ccgsData.stores.filter(s =>
  conceptIds.includes(s.grandParentKey) && companyIds.has(s.parentKey)
);

console.log(`Found ${companies.length} companies and ${stores.length} stores`);

function escapeSql(str) {
  if (!str) return "''";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Generate company INSERT statements in batches
const companyBatches = [];
const batchSize = 100;
for (let i = 0; i < companies.length; i += batchSize) {
  const batch = companies.slice(i, i + batchSize);
  const values = batch.map(co =>
    `(${co.key}, ${escapeSql(co.name)}, ${co.parentKey}, ${co.privilegeLevel}, ${co.parentLevel}, ${co.domainLevel}, ${escapeSql(co.groupTypeString)}, ${co.parentKey})`
  ).join(',\n  ');

  companyBatches.push(`-- Batch ${Math.floor(i/batchSize) + 1}
INSERT INTO companies (id, name, concept_id, privilege_level, parent_level, domain_level, group_type_string, parent_key) VALUES
  ${values}
ON CONFLICT (id) DO NOTHING;
`);
}

// Generate store INSERT statements in batches
const storeBatches = [];
for (let i = 0; i < stores.length; i += batchSize) {
  const batch = stores.slice(i, i + batchSize);
  const values = batch.map(s =>
    `(${s.key}, ${escapeSql(s.name)}, ${s.parentKey}, ${s.privilegeLevel}, ${s.parentLevel}, ${s.domainLevel}, ${escapeSql(s.groupTypeString)}, ${s.parentKey}, ${s.grandParentKey || 'NULL'})`
  ).join(',\n  ');

  storeBatches.push(`-- Batch ${Math.floor(i/batchSize) + 1}
INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key) VALUES
  ${values}
ON CONFLICT (id) DO NOTHING;
`);
}

// Write SQL files
const companySql = `-- Import ${companies.length} companies for 11 concepts
${companyBatches.join('\n')}

SELECT COUNT(*) as total_companies FROM companies;
`;

const storeSql = `-- Import ${stores.length} stores for 11 concepts
${storeBatches.join('\n')}

SELECT COUNT(*) as total_stores FROM stores;
`;

writeFileSync('./import-companies.sql', companySql);
writeFileSync('./import-stores.sql', storeSql);

console.log('✅ Generated SQL files:');
console.log('   - import-companies.sql');
console.log('   - import-stores.sql');
console.log('\nRun these with the MCP execute_sql tool');
