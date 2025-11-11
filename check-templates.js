import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://gxfclamonevgxmdqexzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmNsYW1vbmV2Z3htZHFleHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzIwNzIsImV4cCI6MjA3ODQ0ODA3Mn0.u6zSZ6_kHZ9N0cGhJtKtmfX5sVygPJ18iS_Lvx3v7lQ'
);

async function checkTemplates() {
  console.log('\n========== PRODUCT_ATTRIBUTE_TEMPLATES CHECK ==========\n');
  
  console.log('OLD DATABASE:');
  const { data: oldTemplates, error: oldError } = await oldDb
    .from('product_attribute_templates')
    .select('id, name, description, is_system')
    .order('name');
  
  if (oldError) {
    console.log('ERROR:', oldError.message);
  } else {
    console.log('Count:', oldTemplates.length);
    oldTemplates.forEach(t => {
      console.log('  - ' + t.name + ' (' + t.id + ')');
      console.log('    ' + t.description);
    });
  }
  
  console.log('\n\nNEW DATABASE:');
  const { data: newTemplates, error: newError } = await newDb
    .from('product_attribute_templates')
    .select('id, name, description, is_system')
    .order('name');
  
  if (newError) {
    console.log('ERROR:', newError.message);
  } else {
    console.log('Count:', newTemplates.length);
    if (newTemplates.length === 0) {
      console.log('  *** NO TEMPLATES FOUND - THIS IS THE PROBLEM! ***');
    } else {
      newTemplates.forEach(t => {
        console.log('  - ' + t.name + ' (' + t.id + ')');
        console.log('    ' + t.description);
      });
    }
  }
  
  console.log('\n\n========== ANALYSIS ==========\n');
  
  if (!newTemplates || newTemplates.length === 0) {
    console.log('CRITICAL: product_attribute_templates table is EMPTY in new database!');
    console.log('\nThis explains issues with:');
    console.log('  - Product creation/editing (no attribute schemas)');
    console.log('  - Integration mapping (no templates to map to)');
    console.log('  - Organization settings (references missing template)');
    console.log('\nThese 4 templates need to be migrated:');
    if (oldTemplates) {
      oldTemplates.forEach(t => {
        console.log('  - ' + t.name);
      });
    }
  } else {
    console.log('Templates exist in new database.');
    const oldNames = oldTemplates.map(t => t.name).sort();
    const newNames = newTemplates.map(t => t.name).sort();
    
    const missing = oldNames.filter(n => !newNames.includes(n));
    if (missing.length > 0) {
      console.log('\nMissing templates:', missing.join(', '));
    } else {
      console.log('\nAll templates migrated successfully!');
    }
  }
}

checkTemplates().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
