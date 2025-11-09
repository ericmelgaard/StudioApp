import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function showData() {
  console.log('=== INTEGRATION_PRODUCTS SAMPLE ===\n');
  
  const { data: intProds, error: intError } = await supabase
    .from('integration_products')
    .select('id, name, external_id, path_id')
    .order('name')
    .limit(20);
  
  if (intError) {
    console.error('Error:', intError);
  } else if (intProds && intProds.length > 0) {
    console.log('Sample of ' + intProds.length + ' products:\n');
    intProds.forEach(p => {
      console.log('  ' + p.name);
    });
  }

  console.log('\n\n=== PLACEMENT_GROUPS WITH "GROUP" IN NAME ===\n');
  
  const { data: groupPlacements, error: groupError } = await supabase
    .from('placement_groups')
    .select('id, name, parent_id, store_id')
    .ilike('name', '%Group%')
    .order('name')
    .limit(30);
  
  if (groupError) {
    console.error('Error:', groupError);
  } else if (groupPlacements && groupPlacements.length > 0) {
    console.log('Found ' + groupPlacements.length + ' placement groups with "Group" in name:\n');
    groupPlacements.forEach(p => {
      console.log('  ' + p.name + ' (parent: ' + (p.parent_id || 'NULL') + ', store: ' + (p.store_id || 'NULL') + ')');
    });
  } else {
    console.log('No placement groups with "Group" in name');
  }

  console.log('\n\n=== SEARCHING FOR "DIP CHOICE" ===\n');
  
  const { data: dipPlacements, error: dipError } = await supabase
    .from('placement_groups')
    .select('id, name, parent_id, store_id')
    .ilike('name', '%Dip Choice%')
    .order('name');
  
  if (dipError) {
    console.error('Error:', dipError);
  } else if (dipPlacements && dipPlacements.length > 0) {
    console.log('Found ' + dipPlacements.length + ' with "Dip Choice":\n');
    dipPlacements.forEach(p => {
      console.log('  "' + p.name + '"');
    });
  } else {
    console.log('No placement groups with "Dip Choice" in name');
  }
}

showData().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
