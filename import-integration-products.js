import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function importIntegrationData() {
  try {
    console.log('Starting integration data import...\n');

    console.log('Loading QU API data...');
    const quApiData = JSON.parse(readFileSync('./src/data/QU_API.js', 'utf-8'));

    const { data: existingSource } = await supabase
      .from('integration_sources')
      .select('id')
      .eq('name', 'QU POS')
      .maybeSingle();

    let sourceId;
    if (existingSource) {
      sourceId = existingSource.id;
      console.log('Using existing QU POS source:', sourceId);
    } else {
      const { data: newSource, error: sourceError } = await supabase
        .from('integration_sources')
        .insert({
          name: 'QU POS',
          type: 'pos',
          config: { provider: 'qu', version: '1.0' }
        })
        .select()
        .single();

      if (sourceError) throw sourceError;
      sourceId = newSource.id;
      console.log('Created new QU POS source:', sourceId);
    }

    console.log('\nImporting products...');
    const products = quApiData.menuItems.map(item => ({
      source_id: sourceId,
      external_id: item.id.toString(),
      path_id: item.pathId || null,
      name: item.name,
      item_type: 'product',
      data: item,
      last_synced_at: new Date().toISOString()
    }));

    console.log('\nImporting modifiers...');
    const modifiers = quApiData.modifiers.map(item => ({
      source_id: sourceId,
      external_id: item.id.toString(),
      path_id: item.pathId || null,
      name: item.name,
      modifier_group_id: item.modifierGroupId?.toString() || null,
      modifier_group_name: item.modifierGroupName || null,
      data: item,
      last_synced_at: new Date().toISOString()
    }));

    console.log('\nImporting discounts...');
    const discounts = quApiData.discounts.map(item => ({
      source_id: sourceId,
      external_id: item.id.toString(),
      name: item.name,
      discount_amount: item.discountAmount || null,
      data: item,
      last_synced_at: new Date().toISOString()
    }));

    console.log(`\nTotal items to import: ${products.length + modifiers.length + discounts.length}`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Modifiers: ${modifiers.length}`);
    console.log(`- Discounts: ${discounts.length}`);

    let importedCount = 0;
    const batchSize = 100;

    // Import products
    console.log('\nImporting products to integration_products table...');
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const { error } = await supabase
        .from('integration_products')
        .upsert(batch, {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error importing products batch ${i / batchSize + 1}:`, error);
      } else {
        importedCount += batch.length;
        console.log(`Imported ${importedCount}/${products.length} products`);
      }
    }

    // Import modifiers
    console.log('\nImporting modifiers to integration_modifiers table...');
    for (let i = 0; i < modifiers.length; i += batchSize) {
      const batch = modifiers.slice(i, i + batchSize);
      const { error } = await supabase
        .from('integration_modifiers')
        .upsert(batch, {
          onConflict: 'source_id,external_id,path_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error importing modifiers batch ${i / batchSize + 1}:`, error);
      } else {
        importedCount += batch.length;
        console.log(`Imported ${importedCount - products.length}/${modifiers.length} modifiers`);
      }
    }

    // Import discounts
    console.log('\nImporting discounts to integration_discounts table...');
    for (let i = 0; i < discounts.length; i += batchSize) {
      const batch = discounts.slice(i, i + batchSize);
      const { error } = await supabase
        .from('integration_discounts')
        .upsert(batch, {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error importing discounts batch ${i / batchSize + 1}:`, error);
      } else {
        importedCount += batch.length;
        console.log(`Imported ${importedCount - products.length - modifiers.length}/${discounts.length} discounts`);
      }
    }

    console.log('\n✅ Import completed successfully!');
    console.log(`Total items imported: ${importedCount}`);

  } catch (error) {
    console.error('Error importing integration data:', error);
    process.exit(1);
  }
}

importIntegrationData();
