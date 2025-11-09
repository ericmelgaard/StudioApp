import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FetchRequest {
  config_id: string;
  wand_domain?: string;
}

interface IntegrationConfig {
  id: string;
  config_name: string;
  wand_source: {
    integration_type: string;
    base_url_template: string;
    auth_method: string;
    supports_incremental_sync: boolean;
  };
  config_params: Record<string, any>;
  credentials: Record<string, any>;
  application_level: string;
  concept_id?: number;
  company_id?: number;
  site_id?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { config_id, wand_domain = "api.wanddigital.com" }: FetchRequest = await req.json();

    if (!config_id) {
      throw new Error("config_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error: configError } = await supabase
      .from("integration_source_configs")
      .select(`
        id,
        config_name,
        config_params,
        credentials,
        application_level,
        concept_id,
        company_id,
        site_id,
        wand_source:wand_source_id (
          integration_type,
          base_url_template,
          auth_method,
          supports_incremental_sync
        )
      `)
      .eq("id", config_id)
      .single();

    if (configError || !config) {
      throw new Error(`Configuration not found: ${configError?.message}`);
    }

    const intConfig = config as unknown as IntegrationConfig;

    console.log(`Configuration: ${intConfig.config_name}`);
    console.log(`Application level: ${intConfig.application_level}`);
    console.log(`Config params:`, JSON.stringify(intConfig.config_params));

    // Validate required parameters based on integration type
    if (intConfig.wand_source.integration_type === 'qu') {
      if (!intConfig.config_params?.brand) {
        throw new Error('Missing required parameter: brand. Please configure the brand/concept name.');
      }
      if (!intConfig.config_params?.establishment) {
        throw new Error('Missing required parameter: establishment. Please configure the establishment ID for this location.');
      }
    }

    const url = buildUrl(intConfig, wand_domain);
    const headers = buildHeaders(intConfig);

    console.log(`Fetching from: ${url}`);
    console.log(`Integration type: ${intConfig.wand_source.integration_type}`);
    console.log(`Headers:`, JSON.stringify(headers));

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    await supabase
      .from("integration_source_configs")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        sync_count: (config.sync_count || 0) + 1,
      })
      .eq("id", config_id);

    return new Response(
      JSON.stringify({
        success: true,
        config_id,
        integration_type: intConfig.wand_source.integration_type,
        data,
        fetched_at: new Date().toISOString(),
        metadata: {
          application_level: intConfig.application_level,
          concept_id: intConfig.concept_id,
          company_id: intConfig.company_id,
          site_id: intConfig.site_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching integration data:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        error_code: "FETCH_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildUrl(config: IntegrationConfig, wandDomain: string): string {
  const { base_url_template, integration_type } = config.wand_source;
  const params = config.config_params;

  let url = base_url_template;

  url = url.replace(/{wand_domain}/g, wandDomain);
  url = url.replace(/{integration_type}/g, integration_type);

  url = url.replace(/{brand}/g, params.brand || "");
  url = url.replace(/{establishment}/g, params.establishment || "");
  url = url.replace(/{store}/g, params.store || "");

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const timeOfDay = now.toTimeString().split(" ")[0];

  url = url.replace(/{modified_date}/g, params.modified_date || currentDate);
  url = url.replace(/{menu_date}/g, params.menu_date || now.toISOString());
  url = url.replace(/{start_date}/g, params.start_date || currentDate);
  url = url.replace(/{time_of_day}/g, params.time_of_day || timeOfDay);
  url = url.replace(/{include_recipes}/g, params.include_recipes || "false");
  url = url.replace(/{days}/g, params.days || "3");

  return url;
}

function buildHeaders(config: IntegrationConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const { auth_method } = config.wand_source;
  const credentials = config.credentials;

  switch (auth_method) {
    case "bearer_token":
      if (credentials.token) {
        headers["Authorization"] = credentials.token;
      }
      break;

    case "api_key":
      if (credentials.api_key) {
        headers["X-API-Key"] = credentials.api_key;
      }
      break;

    case "basic_auth":
      if (credentials.username && credentials.password) {
        const encoded = btoa(`${credentials.username}:${credentials.password}`);
        headers["Authorization"] = `Basic ${encoded}`;
      }
      break;

    case "custom":
      if (credentials.custom_headers) {
        Object.assign(headers, credentials.custom_headers);
      }
      break;
  }

  return headers;
}
