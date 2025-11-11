import { createClient } from '@supabase/supabase-js';

const oldDb = createClient(
  'https://igqlyqbhbqmxcksiuzix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWx5cWJoYnFteGNrc2l1eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1NTQsImV4cCI6MjA3ODAzMTU1NH0.2gfVW5hvW5HFc8F1jWqr_PC0fek-FnAq2dqC5VmTwug'
);

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

async function migrate() {
  let total = 0;
  
  // 1. WAND Integration Sources (foundation)
  console.log('\n1. Migrating wand_integration_sources...');
  const { data: wandSources } = await oldDb.from('wand_integration_sources').select('*');
  if (wandSources && wandSources.length > 0) {
    const mapped = wandSources.map(s => ({
      id: s.id,
      name: s.name,
      integration_type: s.integration_type,
      description: s.description,
      base_url_template: s.base_url_template,
      auth_method: s.auth_method,
      required_config_fields: s.required_config_fields,
      optional_config_fields: s.optional_config_fields,
      default_sync_frequency_minutes: s.default_sync_frequency_minutes,
      formatter_name: s.formatter_name,
      supports_products: s.supports_products,
      supports_modifiers: s.supports_modifiers,
      supports_discounts: s.supports_discounts,
      status: s.status,
      api_config: s.metadata || {},
      created_at: s.created_at,
      updated_at: s.updated_at
    }));
    const { error } = await newDb.from('wand_integration_sources').insert(mapped);
    if (!error) {
      console.log('   SUCCESS: ' + mapped.length + ' sources');
      total += mapped.length;
    } else {
      console.log('   ERROR: ' + error.message);
    }
  }
  
  // 2. Integration Source Configs
  console.log('\n2. Migrating integration_source_configs...');
  const { data: configs } = await oldDb.from('integration_source_configs').select('*');
  if (configs && configs.length > 0) {
    const mapped = configs.map(c => ({
      id: c.id,
      wand_source_id: c.wand_source_id,
      config_name: c.config_name,
      application_level: c.application_level,
      concept_id: c.concept_id,
      company_id: c.company_id,
      site_id: c.site_id,
      config_params: c.config_params,
      sync_frequency_minutes: c.sync_frequency_minutes,
      is_active: c.is_active,
      credentials: c.credentials,
      last_sync_at: c.last_sync_at,
      last_sync_status: c.last_sync_status,
      created_at: c.created_at,
      updated_at: c.updated_at
    }));
    const { error } = await newDb.from('integration_source_configs').insert(mapped);
    if (!error) {
      console.log('   SUCCESS: ' + mapped.length + ' configs');
      total += mapped.length;
    } else {
      console.log('   ERROR: ' + error.message);
    }
  }
  
  // 3. Integration Products
  console.log('\n3. Migrating integration_products...');
  const { data: products } = await oldDb.from('integration_products').select('*');
  if (products && products.length > 0) {
    const mapped = products.map(p => ({
      id: p.id,
      source_id: p.source_id,
      source_config_id: p.source_config_id,
      external_id: p.external_id,
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      raw_data: p.data || p.raw_data || {},
      concept_id: p.concept_id,
      company_id: p.company_id,
      site_id: p.site_id,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
    const { error } = await newDb.from('integration_products').insert(mapped);
    if (!error) {
      console.log('   SUCCESS: ' + mapped.length + ' products');
      total += mapped.length;
    } else {
      console.log('   ERROR: ' + error.message);
    }
  }
  
  // 4. Integration Modifiers
  console.log('\n4. Migrating integration_modifiers...');
  const { data: modifiers } = await oldDb.from('integration_modifiers').select('*');
  if (modifiers && modifiers.length > 0) {
    const mapped = modifiers.map(m => ({
      id: m.id,
      source_id: m.source_id,
      source_config_id: m.source_config_id,
      product_id: m.product_id,
      external_id: m.external_id,
      name: m.name,
      price: m.price,
      raw_data: m.data || m.raw_data || {},
      concept_id: m.concept_id,
      company_id: m.company_id,
      site_id: m.site_id,
      created_at: m.created_at,
      updated_at: m.updated_at
    }));
    const { error } = await newDb.from('integration_modifiers').insert(mapped);
    if (!error) {
      console.log('   SUCCESS: ' + mapped.length + ' modifiers');
      total += mapped.length;
    } else {
      console.log('   ERROR: ' + error.message);
    }
  }
  
  // 5. Integration Discounts
  console.log('\n5. Migrating integration_discounts...');
  const { data: discounts } = await oldDb.from('integration_discounts').select('*');
  if (discounts && discounts.length > 0) {
    const mapped = discounts.map(d => ({
      id: d.id,
      source_id: d.source_id,
      source_config_id: d.source_config_id,
      external_id: d.external_id,
      name: d.name,
      discount_type: d.discount_type,
      amount: d.amount,
      raw_data: d.data || d.raw_data || {},
      concept_id: d.concept_id,
      company_id: d.company_id,
      site_id: d.site_id,
      created_at: d.created_at,
      updated_at: d.updated_at
    }));
    const { error } = await newDb.from('integration_discounts').insert(mapped);
    if (!error) {
      console.log('   SUCCESS: ' + mapped.length + ' discounts');
      total += mapped.length;
    } else {
      console.log('   ERROR: ' + error.message);
    }
  }
  
  // 6. Placement Groups (paginated)
  console.log('\n6. Migrating placement_groups...');
  let pgTotal = 0;
  for (let offset = 0; offset < 2000; offset += 500) {
    const { data: placements } = await oldDb.from('placement_groups')
      .select('id,name,parent_id,store_id,placement_type,attributes,sort_order,created_at,updated_at')
      .range(offset, offset + 499);
    
    if (placements && placements.length > 0) {
      const { error } = await newDb.from('placement_groups').insert(placements);
      if (!error) pgTotal += placements.length;
    }
    if (!placements || placements.length < 500) break;
  }
  console.log('   SUCCESS: ' + pgTotal + ' placement groups');
  total += pgTotal;
  
  // 7. Products (with integration_product FK)
  console.log('\n7. Migrating products...');
  const { data: customProducts } = await oldDb.from('products').select('*');
  if (customProducts && customProducts.length > 0) {
    const mapped = customProducts.map(p => ({
      mrn: p.mrn,
      external_id: p.external_id,
      string_id: p.string_id,
      name: p.name,
      description: p.description,
      price: p.price,
      calories: p.calories,
      sort_order: p.sort_order,
      template_id: p.template_id,
      integration_product_id: p.integration_product_id,
      attribute_template_id: p.attribute_template_id,
      attributes: p.attributes,
      attribute_mappings: p.attribute_mappings,
      attribute_overrides: p.attribute_overrides,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
    const { error } = await newDb.from('products').insert(mapped);
    if (!error) {
      console.log('   SUCCESS: ' + mapped.length + ' products');
      total += mapped.length;
    } else {
      console.log('   ERROR: ' + error.message);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION COMPLETE - Total: ' + total + ' rows');
  console.log('='.repeat(70));
}

migrate().then(() => process.exit(0));
