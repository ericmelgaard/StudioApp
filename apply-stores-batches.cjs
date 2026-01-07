const fs = require('fs');

// Read the full stores SQL
const sql = fs.readFileSync('./import_stores.sql', 'utf8');

// Extract just the INSERT VALUES section
const insertStart = sql.indexOf('INSERT INTO temp_ccgs_stores VALUES');
const insertEnd = sql.indexOf(';', insertStart);
const valuesSection = sql.substring(insertStart + 'INSERT INTO temp_ccgs_stores VALUES'.length, insertEnd).trim();

// Split by lines (each store)
const lines = valuesSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
console.log(`Total stores: ${lines.length}`);

// Split into 8 batches (to keep each under ~40KB)
const batchSize = Math.ceil(lines.length / 8);
const batches = [];

for (let i = 0; i < 8; i++) {
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

  const batchSql = `-- Stores Import Batch ${i + 1}
CREATE TEMP TABLE IF NOT EXISTS temp_ccgs_stores (
  name text,
  ccgs_key bigint,
  privilege_level integer,
  parent_level integer,
  domain_level integer,
  group_type_string text,
  parent_key bigint,
  grand_parent_key bigint
);

INSERT INTO temp_ccgs_stores VALUES
${fixedLines.join('\n')}`;

  fs.writeFileSync(`/tmp/stores_batch${i + 1}.sql`, batchSql);
  console.log(`Batch ${i + 1}: ${batchLines.length} stores (${batchSql.length} bytes)`);
}

// Final batch with UPDATE and INSERT
const finalBatch = `
-- Update existing stores
UPDATE stores s
SET ccgs_key = t.ccgs_key,
    privilege_level = t.privilege_level,
    parent_level = t.parent_level,
    domain_level = t.domain_level,
    group_type_string = t.group_type_string,
    parent_key = t.parent_key,
    grand_parent_key = t.grand_parent_key
FROM temp_ccgs_stores t
WHERE s.name = t.name AND s.ccgs_key IS NULL;

-- Insert new stores with generated IDs
INSERT INTO stores (id, name, ccgs_key, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key)
SELECT
  (SELECT COALESCE(MAX(id), 0) FROM stores) + row_number() OVER (),
  t.name, t.ccgs_key, t.privilege_level, t.parent_level, t.domain_level, t.group_type_string, t.parent_key, t.grand_parent_key
FROM temp_ccgs_stores t
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = t.name);

DROP TABLE temp_ccgs_stores;
`;

fs.writeFileSync('/tmp/stores_batch_final.sql', finalBatch);
console.log(`\nGenerated 9 files ready for import`);
