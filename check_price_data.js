import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkPriceData() {
  console.log('=== CHECKING INTEGRATION_PRODUCTS PRICE DATA ===\n');
  
  const { data: products, error } = await supabase
    .from('integration_products')
    .select('id, name, external_id, data')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  if (products && products.length > 0) {
    console.log('Sample products with price data:\n');
    products.forEach(p => {
      console.log('Product:', p.name);
      console.log('External ID:', p.external_id);
      
      // Check various possible price locations
      const priceLocations = {
        'data.prices.prices[0].price': p.data?.prices?.prices?.[0]?.price,
        'data.priceAttribute.prices[0].price': p.data?.priceAttribute?.prices?.[0]?.price,
        'data.price': p.data?.price,
        'data.priceAttribute': p.data?.priceAttribute
      };
      
      console.log('Price locations checked:');
      Object.entries(priceLocations).forEach(([path, value]) => {
        if (value !== undefined && value !== null) {
          console.log(`  ${path}: ${JSON.stringify(value)}`);
        }
      });
      
      console.log('Full data.priceAttribute:', JSON.stringify(p.data?.priceAttribute, null, 2));
      console.log('---\n');
    });
  }

  console.log('\n=== CHECKING INTEGRATION_MODIFIERS PRICE DATA ===\n');
  
  const { data: modifiers, error: modError } = await supabase
    .from('integration_modifiers')
    .select('id, name, external_id, data')
    .limit(5);
  
  if (modError) {
    console.error('Error:', modError);
    return;
  }

  if (modifiers && modifiers.length > 0) {
    console.log('Sample modifiers with price data:\n');
    modifiers.forEach(m => {
      console.log('Modifier:', m.name);
      console.log('External ID:', m.external_id);
      
      const priceLocations = {
        'data.prices.prices[0].price': m.data?.prices?.prices?.[0]?.price,
        'data.priceAttribute.prices[0].price': m.data?.priceAttribute?.prices?.[0]?.price,
        'data.price': m.data?.price
      };
      
      console.log('Price locations checked:');
      Object.entries(priceLocations).forEach(([path, value]) => {
        if (value !== undefined && value !== null) {
          console.log(`  ${path}: ${JSON.stringify(value)}`);
        }
      });
      console.log('---\n');
    });
  }
}

checkPriceData().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
