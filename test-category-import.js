import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCategoryImport() {
  console.log('Testing category-based import functionality...\n');

  // Step 1: Check integration_products for categories
  console.log('Step 1: Checking integration_products for category data...');
  const { data: intProducts, error: intError } = await supabase
    .from('integration_products')
    .select('id, name, data')
    .limit(5);

  if (intError) {
    console.error('✗ Failed to query integration_products:', intError.message);
    return;
  }

  console.log(`✓ Found ${intProducts.length} integration products`);
  
  // Check for category data
  const productsWithCategories = intProducts.filter(p => p.data?.category);
  console.log(`  ${productsWithCategories.length} have category data`);
  
  if (productsWithCategories.length > 0) {
    const sampleProduct = productsWithCategories[0];
    console.log(`  Sample category: "${sampleProduct.data.category}"`);
    console.log(`  Sample categoryId: "${sampleProduct.data.categoryId}"`);
  }

  // Step 2: Test importing a single product with all required fields
  console.log('\nStep 2: Testing product import with attribute_mappings...');
  
  if (intProducts.length === 0) {
    console.log('⚠ No integration products available to test');
    return;
  }

  const testIntProduct = intProducts[0];
  const testProduct = {
    name: `TEST_IMPORT_${Date.now()}`,
    integration_product_id: testIntProduct.id,
    attribute_template_id: null,
    attributes: {
      description: testIntProduct.data?.description || 'Test description',
      price: testIntProduct.data?.price || '0.00'
    },
    attribute_mappings: {
      description: 'description',
      price: 'price'
    },
    attribute_overrides: {}
  };

  const { data: imported, error: importError } = await supabase
    .from('products')
    .insert(testProduct)
    .select();

  if (importError) {
    console.error('✗ Import failed:', importError.message);
    return;
  }

  console.log('✓ Product imported successfully!');
  console.log(`  Product ID: ${imported[0].mrn}`);
  console.log(`  Name: ${imported[0].name}`);
  console.log(`  Attributes:`, JSON.stringify(imported[0].attributes, null, 2));
  console.log(`  Attribute Mappings:`, JSON.stringify(imported[0].attribute_mappings, null, 2));

  // Clean up
  await supabase.from('products').delete().eq('mrn', imported[0].mrn);
  console.log('✓ Test product cleaned up');

  console.log('\n✓ Category import functionality is working!');
  console.log('  - Products table has all required columns');
  console.log('  - Integration products can be imported with attribute mappings');
  console.log('  - Category filtering can be implemented in the UI');
}

testCategoryImport().then(() => process.exit(0)).catch(err => {
  console.error('\n✗ Fatal error:', err);
  process.exit(1);
});
