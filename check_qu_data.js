import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== Checking integration_products table ===\n');
  
  const { data: products, error } = await supabase
    .from('integration_products')
    .select('id, name, source_id, source_config_id')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Sample products:', products.length, 'records');
  products.forEach(p => {
    console.log('  - source_id:', p.source_id);
    console.log('    source_config_id:', p.source_config_id);
    console.log('    name:', p.name);
    console.log('');
  });
  
  console.log('\n=== Checking wand_integration_sources ===\n');
  const { data: sources } = await supabase
    .from('wand_integration_sources')
    .select('*');
  
  if (sources) {
    console.log('WAND Sources:', sources.length, 'total');
    sources.forEach(s => {
      console.log('  - id:', s.id);
      console.log('    type:', s.integration_type);
      console.log('    name:', s.name);
      console.log('');
    });
  }
  
  console.log('\n=== Checking integration_source_configs ===\n');
  const { data: configs } = await supabase
    .from('integration_source_configs')
    .select('id, config_name, wand_source_id, is_active')
    .eq('is_active', true);
  
  if (configs) {
    console.log('Active configs:', configs.length);
    configs.forEach(c => {
      console.log('  - id:', c.id);
      console.log('    name:', c.config_name);
      console.log('    wand_source_id:', c.wand_source_id);
      console.log('');
    });
  }
}

check().then(() => process.exit(0));
