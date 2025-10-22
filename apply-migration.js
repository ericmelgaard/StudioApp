import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://uiezldeuhczqbzmotran.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZXpsZGV1aGN6cWJ6bW90cmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODI3NjEsImV4cCI6MjA3NjY1ODc2MX0.MXpBjOlkZcCNjvgOKrIjEQMgeZuzHvo1qMxR_NL-Ndk';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
ALTER TABLE products
  ALTER COLUMN calories TYPE text,
  ALTER COLUMN price TYPE text;
`;

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} else {
  console.log('Migration applied successfully!');
}
