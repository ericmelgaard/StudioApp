const fs = require('fs');
const path = require('path');

const migrationsDir = '/tmp/cc-agent/60028436/project/supabase/migrations';
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
  .sort();

const productsRelated = files.filter(f => 
  f.includes('products') || 
  f.includes('attribute_mappings') ||
  f.includes('attribute_overrides')
);

console.log('Migration order for products table:');
console.log('=====================================\n');
productsRelated.forEach((file, idx) => {
  const timestamp = file.split('_')[0];
  console.log(`${idx + 1}. ${timestamp} - ${file}`);
});
