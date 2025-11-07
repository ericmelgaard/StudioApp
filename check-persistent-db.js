import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDatabase() {
  console.log('Checking persistent database:', process.env.VITE_SUPABASE_URL);
  console.log('');

  const { data: concepts, error } = await supabase
    .from('concepts')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total concepts: ${concepts.length}`);
  console.log('\nConcept names:');
  concepts.forEach(c => console.log(`  - ${c.name}`));
}

checkDatabase();
