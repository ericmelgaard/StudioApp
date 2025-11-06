import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function importLocations() {
  try {
    console.log('Reading location data...');
    const dataPath = path.join(__dirname, 'src', 'data', 'CCGS list copy.js');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');

    const jsonMatch = fileContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from file');
    }

    const data = JSON.parse(jsonMatch[0]);

    const deduplicateByKey = (array) => {
      const seen = new Map();
      return array.filter(item => {
        if (seen.has(item.key)) {
          return false;
        }
        seen.set(item.key, true);
        return true;
      });
    };

    data.concepts = deduplicateByKey(data.concepts);
    data.companies = deduplicateByKey(data.companies);
    data.groups = deduplicateByKey(data.groups);
    data.stores = deduplicateByKey(data.stores);

    const conceptKeys = new Set(data.concepts.map(c => c.key));

    data.companies = data.companies.filter(c => conceptKeys.has(c.parentKey));

    console.log(`Found ${data.concepts.length} concepts`);
    console.log(`Found ${data.companies.length} companies`);
    console.log(`Found ${data.groups.length} groups`);
    console.log(`Found ${data.stores.length} stores`);

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const apiUrl = `${supabaseUrl}/functions/v1/import-locations`;

    console.log('Importing data via edge function...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Import failed');
    }

    console.log('Import complete!');
    console.log('Imported counts:', result.imported);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importLocations();
