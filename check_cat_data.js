import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCategories() {
  console.log('Searching for Dip Choice variations...\n');
  
  const { data: dipProducts, error: dipError } = await supabase
    .from('integration_products')
    .select('id, name, external_id, path_id, data')
    .ilike('name', '%Dip Choice%')
    .order('name');
  
  if (dipError) {
    console.error('Error:', dipError);
  } else {
    console.log('=== DIP CHOICE VARIATIONS ===');
    console.log('Total found: ' + (dipProducts ? dipProducts.length : 0) + '\n');
    if (dipProducts && dipProducts.length > 0) {
      dipProducts.forEach(p => {
        console.log('External ID: ' + p.external_id);
        console.log('Name: ' + p.name);
        console.log('Path ID: ' + (p.path_id || 'NULL'));
        if (p.data && p.data.pathId) console.log('Data pathId: ' + p.data.pathId);
        console.log('---');
      });
    } else {
      console.log('No Dip Choice products found\n');
    }
  }

  console.log('\nSearching for all Group- patterns...\n');
  
  const { data: groupProducts, error: groupError } = await supabase
    .from('integration_products')
    .select('id, name, external_id')
    .ilike('name', 'Group-%')
    .order('name')
    .limit(20);
  
  if (groupError) {
    console.error('Error:', groupError);
  } else {
    console.log('=== PRODUCTS WITH "Group-" PREFIX ===');
    console.log('Total found: ' + (groupProducts ? groupProducts.length : 0) + '\n');
    if (groupProducts && groupProducts.length > 0) {
      groupProducts.forEach(p => {
        console.log('- ' + p.name);
      });
    }
  }
}

checkCategories().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
