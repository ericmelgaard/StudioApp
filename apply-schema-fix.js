import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function applySchemaFix() {
  console.log('Applying schema fix to products table...\n');
  console.log('Database:', process.env.VITE_SUPABASE_URL);
  console.log('');

  const queries = [
    {
      name: 'attributes',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb`
    },
    {
      name: 'attribute_mappings',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS attribute_mappings jsonb DEFAULT '{}'::jsonb`
    },
    {
      name: 'attribute_overrides',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS attribute_overrides jsonb DEFAULT '{}'::jsonb`
    },
    {
      name: 'attribute_template_id',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS attribute_template_id uuid`
    },
    {
      name: 'display_template_id',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS display_template_id uuid`
    }
  ];

  for (const query of queries) {
    console.log(`Adding column: ${query.name}...`);
    const { error } = await supabase.rpc('exec_sql', { query: query.sql });
    
    if (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    } else {
      console.log(`  ✓ Success`);
    }
  }

  // Create indexes
  console.log('\nCreating indexes...');
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes)`,
    `CREATE INDEX IF NOT EXISTS idx_products_attribute_template_id ON products(attribute_template_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_display_template_id ON products(display_template_id)`
  ];

  for (const idx of indexes) {
    const { error } = await supabase.rpc('exec_sql', { query: idx });
    if (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    } else {
      console.log(`  ✓ Index created`);
    }
  }

  console.log('\nVerifying schema fix...');
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: 'TEST_SCHEMA_FIX',
      attributes: { test: true },
      attribute_mappings: { test: 'value' },
      attribute_overrides: {},
      attribute_template_id: null
    })
    .select();

  if (error) {
    console.error('✗ Verification failed:', error.message);
  } else {
    console.log('✓ Schema fix verified successfully!');
    // Clean up
    await supabase.from('products').delete().eq('name', 'TEST_SCHEMA_FIX');
  }
}

applySchemaFix().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
