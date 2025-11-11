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
  
  // WAND integration sources - select only compatible columns
  console.log('\n[wand_integration_sources]');
  const { data: wandSources } = await oldDb.from('wand_integration_sources')
    .select('id,name,integration_type,description,base_url_template,auth_method,required_config_fields,optional_config_fields,default_sync_frequency_minutes,formatter_name,supports_products,supports_modifiers,supports_discounts,status,api_config,created_at,updated_at');
  
  if (wandSources && wandSources.length > 0) {
    const { error } = await newDb.from('wand_integration_sources').insert(wandSources);
    if (!error) {
      console.log('  SUCCESS: ' + wandSources.length + ' rows');
      total += wandSources.length;
    } else {
      console.log('  ERROR: ' + error.message);
    }
  }
  
  // Integration source configs - select only compatible columns
  console.log('\n[integration_source_configs]');
  const { data: configs } = await oldDb.from('integration_source_configs')
    .select('id,wand_source_id,config_name,application_level,concept_id,company_id,site_id,config_params,sync_frequency_minutes,is_active,credentials,last_sync_at,last_sync_status,created_at,updated_at');
  
  if (configs && configs.length > 0) {
    const { error } = await newDb.from('integration_source_configs').insert(configs);
    if (!error) {
      console.log('  SUCCESS: ' + configs.length + ' rows');
      total += configs.length;
    } else {
      console.log('  ERROR: ' + error.message);
    }
  }
  
  // Integration products - raw_data instead of data
  console.log('\n[integration_products]');
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
      console.log('  SUCCESS: ' + products.length + ' rows');
      total += products.length;
    } else {
      console.log('  ERROR: ' + error.message);
    }
  }
  
  // Integration modifiers
  console.log('\n[integration_modifiers]');
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
      console.log('  SUCCESS: ' + modifiers.length + ' rows');
      total += modifiers.length;
    } else {
      console.log('  ERROR: ' + error.message);
    }
  }
  
  // Integration discounts
  console.log('\n[integration_discounts]');
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
      console.log('  SUCCESS: ' + discounts.length + ' rows');
      total += discounts.length;
    } else {
      console.log('  ERROR: ' + error.message);
    }
  }
  
  // Placement groups - with pagination
  console.log('\n[placement_groups]');
  let placementTotal = 0;
  for (let offset = 0; offset < 2000; offset += 1000) {
    const { data: placements } = await oldDb.from('placement_groups')
      .select('id,name,parent_id,store_id,placement_type,attributes,sort_order,created_at,updated_at')
      .range(offset, offset + 999);
    
    if (placements && placements.length > 0) {
      const { error } = await newDb.from('placement_groups').insert(placements);
      if (!error) {
        placementTotal += placements.length;
      }
    }
    if (!placements || placements.length < 1000) break;
  }
  console.log('  SUCCESS: ' + placementTotal + ' rows');
  total += placementTotal;
  
  // Products
  console.log('\n[products]');
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
      console.log('  SUCCESS: ' + mapped.length + ' rows');
      total += mapped.length;
    } else {
      console.log('  ERROR: ' + error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TOTAL MIGRATED: ' + total + ' rows');
  console.log('='.repeat(60));
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
