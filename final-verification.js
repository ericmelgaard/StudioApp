import { createClient } from '@supabase/supabase-js';

const newDb = createClient(
  'https://alqjamolvfnznxndyxbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWphbW9sdmZuem54bmR5eGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Nzk5NDMsImV4cCI6MjA3ODQ1NTk0M30.m6ZDSQTXTqFE_tI5HXQDLzFwxTP8hcjx7I93ZQ1nvNo'
);

async function verify() {
  const { count: storeCount } = await newDb.from('stores').select('*', { count: 'exact', head: true });
  const { count: productCount } = await newDb.from('products').select('*', { count: 'exact', head: true });
  const { count: templateCount } = await newDb.from('product_attribute_templates').select('*', { count: 'exact', head: true });
  
  console.log('\nFINAL COUNT:');
  console.log('  Stores: ' + storeCount);
  console.log('  Products: ' + productCount);
  console.log('  Product Attribute Templates: ' + templateCount);
  
  // Check templates exist
  const { data: qsr } = await newDb.from('product_attribute_templates').select('*').eq('name', 'QSR').maybeSingle();
  
  if (qsr) {
    console.log('\n✓ QSR Template verified:');
    console.log('  Name: ' + qsr.name);
    console.log('  ID: ' + qsr.id);
    console.log('  Core Attributes: ' + (qsr.attribute_schema?.core_attributes?.length || 0));
    console.log('  Extended Attributes: ' + (qsr.attribute_schema?.extended_attributes?.length || 0));
  }
}

verify().then(() => process.exit(0));
