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
      path_id: item.pathId,
      name: item.name,
      item_type: item.itemType?.toString(),
      data: item,
      last_synced_at: new Date().toISOString()
    }));

    let productCount = 0;
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const { error } = await supabase
        .from('integration_products')
        .upsert(batch, {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error importing product batch ${i / batchSize + 1}:`, error);
      } else {
        productCount += batch.length;
        console.log(`Imported ${productCount}/${products.length} products`);
      }
    }

    console.log('\nImporting modifiers...');
    const modifiers = quApiData.modifiers.map(item => ({
      source_id: sourceId,
      external_id: item.id.toString(),
      path_id: item.pathId,
      name: item.name,
      modifier_group_id: item.modifierGroup?.id?.toString(),
      modifier_group_name: item.modifierGroup?.name,
      data: item,
      last_synced_at: new Date().toISOString()
    }));

    let modifierCount = 0;
    for (let i = 0; i < modifiers.length; i += batchSize) {
      const batch = modifiers.slice(i, i + batchSize);
      const { error } = await supabase
        .from('integration_modifiers')
        .upsert(batch, {
          onConflict: 'source_id,external_id,path_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error importing modifier batch ${i / batchSize + 1}:`, error);
      } else {
        modifierCount += batch.length;
        console.log(`Imported ${modifierCount}/${modifiers.length} modifiers`);
      }
    }

    console.log('\nImporting discounts...');
    const discounts = quApiData.discounts.map(item => ({
      source_id: sourceId,
      external_id: item.id.toString(),
      name: item.name,
      discount_amount: item.discountAmount,
      data: item,
      last_synced_at: new Date().toISOString()
    }));

    let discountCount = 0;
    for (let i = 0; i < discounts.length; i += batchSize) {
      const batch = discounts.slice(i, i + batchSize);
      const { error } = await supabase
        .from('integration_discounts')
        .upsert(batch, {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error importing discount batch ${i / batchSize + 1}:`, error);
      } else {
        discountCount += batch.length;
        console.log(`Imported ${discountCount}/${discounts.length} discounts`);
      }
    }

    console.log('\n✅ Import completed successfully!');
    console.log(`- Products: ${productCount}`);
    console.log(`- Modifiers: ${modifierCount}`);
    console.log(`- Discounts: ${discountCount}`);

  } catch (error) {
    console.error('Error importing integration data:', error);
    process.exit(1);
  }
}

importIntegrationData();
