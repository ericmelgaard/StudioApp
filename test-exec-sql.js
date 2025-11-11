import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testExecSql() {
  console.log('Testing exec_sql function...\n');

  const sql = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position`;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('exec_sql error:', error.message);
    console.log('\nTrying direct query instead...');
    
    // If exec_sql doesn't work, we need to use a different approach
    const { data: tableData, error: tableError } = await supabase
      .from('products')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.error('Direct query also failed:', tableError.message);
    }
  } else {
    console.log('exec_sql works! Result:', data);
  }
}

testExecSql().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
