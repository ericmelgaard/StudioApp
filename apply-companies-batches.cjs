const fs = require('fs');

// Read the full companies SQL
const sql = fs.readFileSync('./import_companies.sql', 'utf8');

// Extract just the INSERT VALUES section
const insertStart = sql.indexOf('INSERT INTO temp_ccgs_companies VALUES');
const insertEnd = sql.indexOf(';', insertStart);
const valuesSection = sql.substring(insertStart + 'INSERT INTO temp_ccgs_companies VALUES'.length, insertEnd).trim();

// Split by lines (each company)
const lines = valuesSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
console.log(`Total companies: ${lines.length}`);

// Split into 3 batches
const batchSize = Math.ceil(lines.length / 3);
const batches = [];

for (let i = 0; i < 3; i++) {
  const start = i * batchSize;
  const end = Math.min((i + 1) * batchSize, lines.length);
  const batchLines = lines.slice(start, end);

  // Fix commas - last line in batch should have semicolon
  const fixedLines = batchLines.map((line, idx) => {
    if (idx === batchLines.length - 1) {
      return line.replace(/,$/, ';');
    }
    return line;
  });

  const batchSql = `-- Companies Import Batch ${i + 1}
CREATE TEMP TABLE IF NOT EXISTS temp_ccgs_companies (
  name text,
  ccgs_key bigint,
  privilege_level integer,
  parent_level integer,
  domain_level integer,
  group_type_string text,
  parent_key bigint
);

INSERT INTO temp_ccgs_companies VALUES
${fixedLines.join('\n')}`;

  fs.writeFileSync(`/tmp/companies_batch${i + 1}.sql`, batchSql);
  console.log(`Batch ${i + 1}: ${batchLines.length} companies (${batchSql.length} bytes)`);
}

// Final batch with UPDATE and INSERT
const finalBatch = `
-- Update existing companies
UPDATE companies c
SET ccgs_key = t.ccgs_key,
    privilege_level = t.privilege_level,
    parent_level = t.parent_level,
    domain_level = t.domain_level,
    group_type_string = t.group_type_string,
    parent_key = t.parent_key
FROM temp_ccgs_companies t
WHERE c.name = t.name AND c.ccgs_key IS NULL;

-- Insert new companies with generated IDs
INSERT INTO companies (id, name, ccgs_key, privilege_level, parent_level, domain_level, group_type_string, parent_key)
SELECT
  (SELECT COALESCE(MAX(id), 0) FROM companies) + row_number() OVER (),
  t.name, t.ccgs_key, t.privilege_level, t.parent_level, t.domain_level, t.group_type_string, t.parent_key
FROM temp_ccgs_companies t
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = t.name);

DROP TABLE temp_ccgs_companies;
`;

fs.writeFileSync('/tmp/companies_batch_final.sql', finalBatch);
console.log(`\nGenerated 4 files ready for import`);
