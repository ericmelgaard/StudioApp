const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testTranslationPush() {
  const { data: template } = await supabase
    .from('product_attribute_templates')
    .select('*')
    .eq('name', 'QSR')
    .maybeSingle();

  if (!template) {
    console.log('Template not found');
    return;
  }

  console.log('Current template translations:', template.translations || 'None');

  const { data: products } = await supabase
    .from('products')
    .select('id, name, attributes')
    .eq('attribute_template_id', template.id)
    .limit(1);

  if (products && products.length > 0) {
    const product = products[0];
    console.log('\nSample product:', product.name);
    console.log('Translation attributes in product:');

    const translationKeys = Object.keys(product.attributes || {}).filter(k => k.startsWith('translations_'));
    if (translationKeys.length > 0) {
      translationKeys.forEach(key => {
        console.log('  -', key, ':', JSON.stringify(product.attributes[key]));
      });
    } else {
      console.log('  No translation attributes found');
    }
  } else {
    console.log('\nNo products found using this template');
  }
}

testTranslationPush().catch(console.error);
