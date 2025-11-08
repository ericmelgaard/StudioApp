import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Parse city and state from store name
function parseCityState(storeName) {
  // Common patterns:
  // "City, ST"
  // "City, State"
  // "CITY, ST - #12345"
  // "#12345 - City, ST"

  const patterns = [
    /([A-Za-z\s.]+),\s*([A-Z]{2})\s*[-()]/,  // "City, ST -" or "City, ST ("
    /[-–]\s*([A-Za-z\s.]+),\s*([A-Z]{2})\s*[-()]/,  // "- City, ST -"
    /([A-Za-z\s.]+),\s*([A-Z]{2})$/,  // "City, ST" at end
    /[-–]\s*([A-Za-z\s.]+),\s*([A-Z]{2})$/,  // "- City, ST" at end
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

// Geocode using OpenStreetMap Nominatim (free, no API key needed)
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
      console.error(`Geocoding failed for ${city}, ${state}: ${response.status}`);
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
    console.error(`Error geocoding ${city}, ${state}:`, error.message);
    return null;
  }
}

async function geocodeStores() {
  console.log('Fetching stores without coordinates...');

  // Get all stores without coordinates
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, city, state')
    .is('latitude', null);

  if (error) {
    console.error('Error fetching stores:', error);
    return;
  }

  console.log(`Found ${stores.length} stores without coordinates`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const store of stores) {
    // Try to use existing city/state if available
    let cityState = null;

    if (store.city && store.state) {
      cityState = { city: store.city, state: store.state };
    } else {
      // Parse from name
      cityState = parseCityState(store.name);
    }

    if (!cityState) {
      console.log(`⏭️  Skipped: ${store.name} (no city/state found)`);
      skipped++;
      continue;
    }

    console.log(`🔍 Geocoding: ${store.name} -> ${cityState.city}, ${cityState.state}`);

    // Geocode
    const coords = await geocode(cityState.city, cityState.state);

    if (coords) {
      // Update store with coordinates and parsed city/state
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: cityState.city,
          state: cityState.state
        })
        .eq('id', store.id);

      if (updateError) {
        console.error(`Error updating store ${store.id}:`, updateError);
        failed++;
      } else {
        console.log(`✅ Updated: ${store.name} (${coords.latitude}, ${coords.longitude})`);
        updated++;
      }
    } else {
      console.log(`❌ Failed: ${store.name} (geocoding failed)`);
      failed++;
    }

    // Rate limiting - be nice to Nominatim
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Summary:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${stores.length}`);
}

geocodeStores();
