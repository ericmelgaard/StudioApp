/*
  # Seed WAND Integration Sources

  1. Purpose
    - Populate wand_integration_sources with all supported integration types
    - Define URL templates, required fields, and formatter references
    - Set default sync intervals based on legacy code behavior

  2. Integration Types Seeded
    - Qu POS API
    - Revel POS
    - Toast POS
    - Par Brink (Brink POS)
    - Shift4 Payments
    - Oracle Simphony
    - Transact Campus
    - Clover POS
    - Meal Tracker (AppJel)
    - Webtrition
    - Bon Appétit
    - Bepoz POS

  3. Notes
    - Base URL templates use {variables} for dynamic substitution
    - Required config fields defined as JSON array
    - Formatters reference functions to be implemented in edge functions
*/

-- Insert Qu POS API
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  min_update_interval_ms,
  max_update_interval_ms,
  fallback_interval_ms,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  documentation_url,
  status,
  metadata
) VALUES (
  'Qu POS API',
  'qu',
  'Qu POS integration for restaurant menu and item data',
  'https://qubeyond-{wand_domain}/integration?id={establishment}&concept={brand}&date={modified_date}&time={time_of_day}',
  'api_key',
  '["brand", "establishment"]'::jsonb,
  '["modified_date", "time_of_day"]'::jsonb,
  15,
  3000000,
  9000000,
  30000,
  'formatQu',
  true,
  true,
  true,
  true,
  'https://docs.qu.com',
  'active',
  '{"supports_path_id": true, "filters_olo": true, "uses_anchor_system": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Revel POS
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  min_update_interval_ms,
  max_update_interval_ms,
  fallback_interval_ms,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Revel POS',
  'revel',
  'Revel Systems POS integration',
  'https://revel-{wand_domain}/integration?client={brand}&id={establishment}&date={modified_date}&storeId={store}',
  'api_key',
  '["brand", "establishment", "store"]'::jsonb,
  '["modified_date"]'::jsonb,
  240,
  9000000,
  18000000,
  30000,
  'formatRevel',
  true,
  true,
  true,
  false,
  'active',
  '{"uses_barcode": true, "filters_olo": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Toast POS
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Toast POS',
  'toast',
  'Toast POS restaurant management system',
  'https://{wand_domain}/services/toast/client/menu/',
  'bearer_token',
  '["trm_store_id"]'::jsonb,
  '[]'::jsonb,
  15,
  'formatToast',
  false,
  true,
  true,
  false,
  'active',
  '{"requires_header_auth": true, "uses_multi_location_id": true, "flattens_menu_structure": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Par Brink POS
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Par Brink POS',
  'par',
  'Par Brink (formerly Brink) POS system',
  'https://{wand_domain}/integrations/parbrink/v1?concept={brand}&id={establishment}',
  'api_key',
  '["brand", "establishment"]'::jsonb,
  '[]'::jsonb,
  15,
  'formatPar',
  false,
  true,
  true,
  false,
  'active',
  '{"returns_full_menu": true, "has_modifier_groups": true, "filters_olo": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Shift4 Payments
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Shift4 Payments',
  'shift4',
  'Shift4 payment and POS integration',
  'https://shift4-{wand_domain}/integration?id={establishment}',
  'api_key',
  '["establishment"]'::jsonb,
  '[]'::jsonb,
  15,
  'formatShift',
  false,
  true,
  true,
  false,
  'active',
  '{"returns_full_menu": true, "parses_unique_id": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Oracle Simphony
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Oracle Simphony',
  'simphony',
  'Oracle Simphony POS system',
  'https://simphony-{wand_domain}/integration?concept={brand}&id={establishment}',
  'api_key',
  '["brand", "establishment"]'::jsonb,
  '[]'::jsonb,
  15,
  'formatSimphony',
  false,
  true,
  true,
  false,
  'active',
  '{"has_condiment_groups": true, "uses_family_groups": true, "supports_localization": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Transact Campus
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Transact Campus',
  'transact',
  'Transact Campus dining and payment system',
  'https://transact-{wand_domain}/integration?concept={brand}',
  'api_key',
  '["brand"]'::jsonb,
  '[]'::jsonb,
  15,
  'formatTransact',
  false,
  true,
  false,
  false,
  'active',
  '{"returns_full_menu": true, "uses_item_number": true, "uses_class_field": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Clover POS
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Clover POS',
  'clover',
  'Clover point-of-sale system',
  'https://{wand_domain}/integrations/{integration_type}/v1/{brand}?merchantId={establishment}',
  'api_key',
  '["brand", "establishment"]'::jsonb,
  '[]'::jsonb,
  15,
  'formatClover',
  false,
  true,
  true,
  false,
  'active',
  '{"price_in_cents": true, "has_menu_structure": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Meal Tracker (AppJel)
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Meal Tracker (AppJel)',
  'mealtracker',
  'Meal Tracker by AppJel dining management',
  'https://appjel-{wand_domain}/integration?id={establishment}&startDate={start_date}',
  'api_key',
  '["establishment"]'::jsonb,
  '["start_date"]'::jsonb,
  15,
  'formatMealtracker',
  false,
  true,
  false,
  false,
  'active',
  '{"returns_full_menu": true, "has_day_structure": true, "has_meal_periods": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Webtrition
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Webtrition',
  'webtrition',
  'Webtrition nutrition and menu management system',
  'https://{wand_domain}/services/webtrition/client/wds?SapCode={brand}&Venue={establishment}&mealPeriod=&MenuDate={menu_date}&SourceSystem=1&Days=3&IncludeNutrition=true&IncludeAllergens=true&IncludeIngredients=true&IncludeRecipe={include_recipes}',
  'api_key',
  '["brand", "establishment"]'::jsonb,
  '["menu_date", "include_recipes", "days"]'::jsonb,
  15,
  'formatWebtrition',
  false,
  true,
  false,
  false,
  'active',
  '{"returns_full_menu": true, "supports_combo_items": true, "has_nutrition_data": true, "has_allergen_data": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Bon Appétit
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Bon Appétit',
  'bonappetit',
  'Bon Appétit Management Company dining services',
  'https://{wand_domain}/integrations/{integration_type}?campus={brand}&cafe={establishment}&menuDate={menu_date}',
  'api_key',
  '["brand", "establishment"]'::jsonb,
  '["menu_date"]'::jsonb,
  15,
  'formatBonappetit',
  false,
  true,
  false,
  false,
  'active',
  '{"returns_full_menu": true, "uses_station_field": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert Bepoz POS
INSERT INTO wand_integration_sources (
  name,
  integration_type,
  description,
  base_url_template,
  auth_method,
  required_config_fields,
  optional_config_fields,
  default_sync_frequency_minutes,
  formatter_name,
  supports_incremental_sync,
  supports_products,
  supports_modifiers,
  supports_discounts,
  status,
  metadata
) VALUES (
  'Bepoz POS',
  'bepoz',
  'Bepoz restaurant POS system',
  'https://bepoz-{wand_domain}/integration?concept={brand}',
  'api_key',
  '["brand"]'::jsonb,
  '[]'::jsonb,
  15,
  'formatBepoz',
  false,
  true,
  false,
  false,
  'active',
  '{"returns_full_menu": true, "normalizes_ids": true, "has_allergen_data": true}'::jsonb
) ON CONFLICT (integration_type) DO NOTHING;

-- Insert corresponding formatters
INSERT INTO integration_formatters (name, version, integration_type, description, formatter_code_ref)
VALUES
  ('formatQu', '1.0', 'qu', 'Formats Qu POS API data with pathId/id mapping and OLO filtering', 'formatters/qu.ts'),
  ('formatRevel', '1.0', 'revel', 'Formats Revel POS data using barcode as mappingId', 'formatters/revel.ts'),
  ('formatToast', '1.0', 'toast', 'Formats Toast POS data with flattened menu structure', 'formatters/toast.ts'),
  ('formatPar', '1.0', 'par', 'Formats Par Brink data with modifier group handling', 'formatters/par.ts'),
  ('formatShift', '1.0', 'shift4', 'Formats Shift4 data with uniqueId parsing', 'formatters/shift4.ts'),
  ('formatSimphony', '1.0', 'simphony', 'Formats Oracle Simphony data with condiment groups', 'formatters/simphony.ts'),
  ('formatTransact', '1.0', 'transact', 'Formats Transact Campus data with item number mapping', 'formatters/transact.ts'),
  ('formatClover', '1.0', 'clover', 'Formats Clover POS data with price conversion', 'formatters/clover.ts'),
  ('formatMealtracker', '1.0', 'mealtracker', 'Formats Meal Tracker data with day/meal structure', 'formatters/mealtracker.ts'),
  ('formatWebtrition', '1.0', 'webtrition', 'Formats Webtrition data with combo item handling', 'formatters/webtrition.ts'),
  ('formatBonappetit', '1.0', 'bonappetit', 'Formats Bon Appétit data with station categories', 'formatters/bonappetit.ts'),
  ('formatBepoz', '1.0', 'bepoz', 'Formats Bepoz POS data with ID normalization', 'formatters/bepoz.ts')
ON CONFLICT (integration_type, version) DO NOTHING;
