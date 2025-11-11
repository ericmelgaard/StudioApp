import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

async function migrate() {
  console.log('\nMigrating placement_groups in batches...\n');
  
  let total = 0;
  let batch = 0;
  
  while (true) {
    batch++;
    const offset = (batch - 1) * 500;
    
    console.log('Batch ' + batch + ' (offset ' + offset + ')...');
    
    const { data, error: fetchError } = await oldDb
      .from('placement_groups')
      .select('id,name,parent_id,store_id,placement_type,attributes,sort_order,created_at,updated_at')
      .range(offset, offset + 499);
    
    if (fetchError) {
      console.log('  Fetch error: ' + fetchError.message);
      break;
    }
    
    if (!data || data.length === 0) {
      console.log('  No more data');
      break;
    }
    
    const { error: insertError } = await newDb
      .from('placement_groups')
      .insert(data);
    
    if (insertError) {
      console.log('  Insert error: ' + insertError.message);
      // Continue anyway to see how many we can get
    } else {
      console.log('  SUCCESS: ' + data.length + ' rows');
      total += data.length;
    }
    
    if (data.length < 500) break;
  }
  
  console.log('\nTotal placement_groups migrated: ' + total);
}

migrate().then(() => process.exit(0));
