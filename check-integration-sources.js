import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

async function check() {
  console.log('Checking wand_integration_sources...');
  const { data: sources, error } = await oldDb.from('wand_integration_sources').select('*').limit(5);
  
  if (error) {
    console.log('Error:', error.message);
  } else if (sources) {
    console.log('Found ' + sources.length + ' sources');
    if (sources.length > 0) {
      console.log('Columns:', Object.keys(sources[0]).join(', '));
      console.log('\nSample:');
      sources.forEach(s => {
        console.log('  - ' + s.name + ' (' + s.integration_type + ')');
      });
    }
  }
  
  console.log('\n\nChecking placement_groups...');
  const { data: placements, error: pError } = await oldDb.from('placement_groups').select('*').limit(3);
  
  if (pError) {
    console.log('Error:', pError.message);
  } else if (placements) {
    console.log('Found ' + placements.length + ' placement groups');
    if (placements.length > 0) {
      console.log('Columns:', Object.keys(placements[0]).join(', '));
    }
  }
}

check().then(() => process.exit(0));
