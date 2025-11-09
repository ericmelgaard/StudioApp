import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSchema() {
  console.log('Checking for tables with product or placement in name...\n');
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .or('table_name.ilike.%product%,table_name.ilike.%placement%');
  
  if (error) {
    console.log('Cannot query schema directly. Trying known tables...\n');
    
    const tables = [
      'wand_products',
      'integration_products',
      'products',
      'placement_groups',
      'placement_products',
      'positions',
      'position_products'
    ];
    
    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(table + ': ' + count + ' rows');
      }
    }
  } else {
    console.log('Tables found:', data);
  }
}

checkSchema().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
