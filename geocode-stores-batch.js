import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Parse city and state from store name
function parseCityState(storeName) {
  const patterns = [
    /([A-Za-z\s.]+),\s*([A-Z]{2})\s*[-()]/,
    /[-–]\s*([A-Za-z\s.]+),\s*([A-Z]{2})\s*[-()]/,
    /([A-Za-z\s.]+),\s*([A-Z]{2})$/,
    /[-–]\s*([A-Za-z\s.]+),\s*([A-Z]{2})$/,
  ];

  for (const pattern of patterns) {
    const match = storeName.match(pattern);
    if (match) {
      const city = match[1].trim();
      const state = match[2].trim();
      return { city, state };
    }
  }

  return null;
}

// Geocode using OpenStreetMap Nominatim
async function geocode(city, state) {
  const query = encodeURIComponent(`${city}, ${state}, USA`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WAND-Digital-Store-Geocoder/1.0'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function geocodeBatch(stores, batchName) {
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const store of stores) {
    let cityState = null;

    if (store.city && store.state) {
      cityState = { city: store.city, state: store.state };
    } else {
      cityState = parseCityState(store.name);
    }

    if (!cityState) {
      skipped++;
      continue;
    }

    const coords = await geocode(cityState.city, cityState.state);

    if (coords) {
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: cityState.city,
          state: cityState.state
        })
        .eq('id', store.id);

      if (!updateError) {
        updated++;
        if (updated % 10 === 0) {
          console.log(`  ${batchName}: ${updated} updated...`);
        }
      } else {
        failed++;
      }
    } else {
      failed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  return { updated, failed, skipped };
}

async function geocodeStoresParallel() {
  console.log('Fetching stores without coordinates...');

  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, city, state')
    .is('latitude', null)
    .limit(200); // Process first 200 stores

  if (error) {
    console.error('Error fetching stores:', error);
    return;
  }

  console.log(`Processing ${stores.length} stores in parallel batches...\n`);

  // Split into 4 batches for parallel processing
  const batchSize = Math.ceil(stores.length / 4);
  const batches = [];
  for (let i = 0; i < 4; i++) {
    batches.push(stores.slice(i * batchSize, (i + 1) * batchSize));
  }

  // Process batches in parallel
  const startTime = Date.now();
  const results = await Promise.all(
    batches.map((batch, i) => geocodeBatch(batch, `Batch ${i + 1}`))
  );

  // Aggregate results
  const totals = results.reduce(
    (acc, r) => ({
      updated: acc.updated + r.updated,
      failed: acc.failed + r.failed,
      skipped: acc.skipped + r.skipped,
    }),
    { updated: 0, failed: 0, skipped: 0 }
  );

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n📊 Summary:');
  console.log(`  Updated: ${totals.updated}`);
  console.log(`  Failed: ${totals.failed}`);
  console.log(`  Skipped: ${totals.skipped}`);
  console.log(`  Total processed: ${stores.length}`);
  console.log(`  Duration: ${duration} minutes`);

  // Check remaining
  const { data: remaining } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .is('latitude', null);

  console.log(`\n  Remaining stores without coordinates: ${remaining?.length || 0}`);

  if (remaining && remaining.length > 0) {
    console.log('\n💡 Run this script again to process more stores.');
  }
}

geocodeStoresParallel();
