import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTables() {
  
  // Check wand_products
  console.log('=== WAND_PRODUCTS TABLE ===\n');
  const { data: wandProducts, error: wandError } = await supabase
    .from('wand_products')
    .select('id, name, category')
    .not('category', 'is', null)
    .order('category')
    .limit(30);
  
  if (wandError) {
    console.error('Error:', wandError);
  } else {
    console.log('Total products with categories: ' + (wandProducts ? wandProducts.length : 0) + '\n');
    if (wandProducts && wandProducts.length > 0) {
      const categories = new Set();
      wandProducts.forEach(p => {
        if (p.category) categories.add(p.category);
      });
      console.log('Unique categories found:');
      Array.from(categories).sort().forEach(cat => {
        const count = wandProducts.filter(p => p.category === cat).length;
        console.log('  - ' + cat + ' (' + count + ' items)');
      });
    } else {
      console.log('No products with categories found');
    }
  }

  // Check products table
  console.log('\n\n=== PRODUCTS TABLE ===\n');
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name')
    .limit(10);
  
  if (prodError) {
    console.log('Products table does not exist or error: ' + prodError.message);
  } else {
    console.log('Products found: ' + (products ? products.length : 0));
  }

  // Check placement_groups
  console.log('\n\n=== PLACEMENT_GROUPS TABLE ===\n');
  const { data: placements, error: placeError } = await supabase
    .from('placement_groups')
    .select('id, name')
    .order('name')
    .limit(20);
  
  if (placeError) {
    console.error('Error:', placeError);
  } else {
    console.log('Placement groups found: ' + (placements ? placements.length : 0));
    if (placements && placements.length > 0) {
      placements.forEach(p => {
        console.log('  - ' + p.name);
      });
    }
  }
}

checkTables().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
