import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  '20251030210907_create_users_and_roles.sql',
  '20251030210918_create_placement_groups.sql',
  '20251030210933_update_placement_groups_add_attributes.sql',
  '20251030210936_create_default_placement_group.sql',
  '20251030210938_allow_anon_access_placement_groups.sql',
  '20251030211008_create_location_hierarchy.sql',
  '20251030211010_add_company_id_to_stores.sql',
  '20251030211050_create_integration_products_schema.sql',
  '20251030211053_fix_integration_sources_insert_policy.sql',
  '20251030211055_create_integration_sync_tracking.sql',
  '20251030211123_create_products_and_templates.sql',
  '20251030211157_create_product_attribute_templates.sql',
  '20251030211200_add_organization_product_settings.sql',
  '20251030211202_create_integration_attribute_mappings.sql',
  '20251030211204_update_integration_attribute_mappings_for_templates.sql',
  '20251030211243_create_auto_import_rules.sql',
  '20251030211246_add_attribute_overrides_to_products.sql',
  '20251030211248_add_image_type_to_templates.sql',
  '20251030211250_add_richtext_type_to_templates.sql',
  '20251030211253_add_product_level_attribute_mappings.sql',
  '20251030211255_migrate_sizes_from_extended.sql',
  '20251030225329_update_qsr_template_price_optional.sql',
];

const migrationsDir = './supabase/migrations';

for (const migration of migrations) {
  const migrationPath = path.join(migrationsDir, migration);
  console.log(`Applying migration: ${migration}`);

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`Failed to apply ${migration}:`, error);
      process.exit(1);
    }

    console.log(`✓ Successfully applied ${migration}`);
  } catch (err) {
    console.error(`Error reading or applying ${migration}:`, err);
    process.exit(1);
  }
}

console.log('\nAll migrations applied successfully!');
