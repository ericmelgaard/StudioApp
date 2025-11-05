import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LocationData {
  concepts: Array<{
    name: string;
    privilegeLevel: number;
    parentLevel: number;
    domainLevel: number;
    groupTypeString: string;
    key: number;
    parentKey: number;
  }>;
  companies: Array<{
    name: string;
    privilegeLevel: number;
    parentLevel: number;
    domainLevel: number;
    groupTypeString: string;
    key: number;
    parentKey: number;
  }>;
  stores: Array<{
    name: string;
    privilegeLevel: number;
    parentLevel: number;
    domainLevel: number;
    groupTypeString: string;
    key: number;
    parentKey: number;
    grandParentKey: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const data: LocationData = await req.json();

    const conceptsData = data.concepts.map(c => ({
      id: c.key,
      name: c.name,
      privilege_level: c.privilegeLevel,
      parent_level: c.parentLevel,
      domain_level: c.domainLevel,
      group_type_string: c.groupTypeString,
      parent_key: c.parentKey,
    }));

    const { error: conceptsError } = await supabase
      .from('concepts')
      .upsert(conceptsData, { onConflict: 'id' });

    if (conceptsError) throw conceptsError;

    const companiesData = data.companies.map(c => ({
      id: c.key,
      name: c.name,
      concept_id: c.parentKey,
      privilege_level: c.privilegeLevel,
      parent_level: c.parentLevel,
      domain_level: c.domainLevel,
      group_type_string: c.groupTypeString,
      parent_key: c.parentKey,
    }));

    const { error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });

    if (companiesError) throw companiesError;

    const storesData = data.stores.map(s => ({
      id: s.key,
      name: s.name,
      company_id: s.grandParentKey,
      privilege_level: s.privilegeLevel,
      parent_level: s.parentLevel,
      domain_level: s.domainLevel,
      group_type_string: s.groupTypeString,
      parent_key: s.parentKey,
      grand_parent_key: s.grandParentKey,
    }));

    const { error: storesError } = await supabase
      .from('stores')
      .upsert(storesData, { onConflict: 'id' });

    if (storesError) throw storesError;

    return new Response(
      JSON.stringify({
        success: true,
        imported: {
          concepts: conceptsData.length,
          companies: companiesData.length,
          stores: storesData.length,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});