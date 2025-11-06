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
  groups: Array<{
    name: string;
    privilegeLevel: number;
    parentLevel: number;
    domainLevel: number;
    groupTypeString: string;
    key: number;
    parentKey: number;
    grandParentKey: number;
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

    const validCompanyIds = new Set(companiesData.map(c => c.id));
    const groupToCompany = new Map();
    data.groups.forEach(g => {
      groupToCompany.set(g.key, g.parentKey);
    });

    const storesData = data.stores.map(s => {
      let companyId = null;

      if (validCompanyIds.has(s.parentKey)) {
        companyId = s.parentKey;
      } else if (groupToCompany.has(s.parentKey)) {
        const companyViaGroup = groupToCompany.get(s.parentKey);
        if (companyViaGroup && validCompanyIds.has(companyViaGroup)) {
          companyId = companyViaGroup;
        }
      }

      return {
        id: s.key,
        name: s.name,
        company_id: companyId,
        privilege_level: s.privilegeLevel,
        parent_level: s.parentLevel,
        domain_level: s.domainLevel,
        group_type_string: s.groupTypeString,
        parent_key: s.parentKey,
        grand_parent_key: s.grandParentKey,
      };
    });

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
