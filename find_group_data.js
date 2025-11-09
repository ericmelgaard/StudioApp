import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function findGroupData() {
  
  // Check integration_modifiers table
  console.log('=== INTEGRATION_MODIFIERS TABLE ===\n');
  
  const { data: modifiers, error: modError } = await supabase
    .from('integration_modifiers')
    .select('id, name, modifier_group_name, external_id')
    .ilike('modifier_group_name', '%Group%')
    .order('modifier_group_name')
    .limit(30);
  
  if (modError) {
    console.log('Error or table does not exist:', modError.message);
  } else if (modifiers && modifiers.length > 0) {
    console.log('Found ' + modifiers.length + ' modifiers with "Group" in group name:\n');
    
    const groupNames = new Set();
    modifiers.forEach(m => {
      if (m.modifier_group_name) groupNames.add(m.modifier_group_name);
    });
    
    console.log('Unique modifier group names:');
    Array.from(groupNames).sort().forEach(name => {
      const count = modifiers.filter(m => m.modifier_group_name === name).length;
      console.log('  ' + name + ' (' + count + ' items)');
    });
  } else {
    console.log('No modifiers found with "Group" in name');
  }

  // Now check for exact matches to screenshot
  console.log('\n\n=== CHECKING FOR EXACT MATCHES ===\n');
  
  const searchTerms = [
    'Group-J-Classic 15 Pack',
    'Group-J-Tumbler Choice',
    'Group-AA-Dip Choice-6',
    'Group-AA-Dip Choice',
    'Group-AA-Dip Choice-3'
  ];
  
  for (const term of searchTerms) {
    const { data, error } = await supabase
      .from('integration_modifiers')
      .select('id, name, modifier_group_name')
      .eq('modifier_group_name', term)
      .limit(5);
    
    if (!error && data && data.length > 0) {
      console.log('Found match for "' + term + '": ' + data.length + ' items');
      data.forEach(item => {
        console.log('  - ' + item.name);
      });
    }
  }
}

findGroupData().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
