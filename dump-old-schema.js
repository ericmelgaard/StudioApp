import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load OLD database credentials
const oldEnv = dotenv.parse(fs.readFileSync('.env.old'));
const supabase = createClient(oldEnv.VITE_SUPABASE_URL, oldEnv.VITE_SUPABASE_ANON_KEY);

console.log('Extracting schema from old database...');
console.log(`Database: ${oldEnv.VITE_SUPABASE_URL}\n`);

// Query to get all table structures
const schemaQuery = `
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT IN ('schema_migrations')
ORDER BY table_name, ordinal_position;
`;

const { data, error } = await supabase.rpc('exec_sql', { sql_query: schemaQuery });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Schema extracted successfully!');
console.log(JSON.stringify(data, null, 2));
