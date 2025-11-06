import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  config_id: string;
  wand_domain?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { config_id, wand_domain = "api.wanddigital.com" }: SyncRequest = await req.json();

    if (!config_id) {
      throw new Error("config_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startedAt = new Date().toISOString();

    const { data: config, error: configError } = await supabase
      .from("integration_source_configs")
      .select(`
        id,
        config_name,
        application_level,
        concept_id,
        company_id,
        site_id,
        wand_source:wand_source_id (
          id,
          name,
          integration_type
        )
      `)
      .eq("id", config_id)
      .single();

    if (configError || !config) {
      throw new Error(`Configuration not found: ${configError?.message}`);
    }

    const wandSource = config.wand_source as any;
    const syncHistoryId = crypto.randomUUID();

    await supabase.from("integration_sync_history").insert({
      id: syncHistoryId,
      source_name: wandSource.name,
      source_config_id: config_id,
      status: "in_progress",
      started_at: startedAt,
      items_synced: 0,
    });

    console.log(`Starting sync for config: ${config.config_name}`);
    console.log(`Integration type: ${wandSource.integration_type}`);

    console.log("Step 1: Fetching data from integration API...");
    const fetchResponse = await fetch(
      `${supabaseUrl}/functions/v1/fetch-integration-data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ config_id, wand_domain }),
      }
    );

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      throw new Error(`Fetch failed: ${errorText}`);
    }

    const fetchResult = await fetchResponse.json();

    if (!fetchResult.success) {
      throw new Error(`Fetch failed: ${fetchResult.error}`);
    }

    console.log("Step 2: Formatting data...");
    const formatResponse = await fetch(
      `${supabaseUrl}/functions/v1/format-integration-data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          integration_type: wandSource.integration_type,
          data: fetchResult.data,
          config_id,
        }),
      }
    );

    if (!formatResponse.ok) {
      const errorText = await formatResponse.text();
      throw new Error(`Format failed: ${errorText}`);
    }

    const formatResult = await formatResponse.json();

    if (!formatResult.success) {
      throw new Error(`Format failed: ${formatResult.error}`);
    }

    console.log(
      `Formatted ${formatResult.counts.products} products, ${formatResult.counts.modifiers} modifiers, ${formatResult.counts.discounts} discounts`
    );

    console.log("Step 3: Saving to database...");
    const saveResponse = await fetch(
      `${supabaseUrl}/functions/v1/save-integration-data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          config_id,
          source_id: wandSource.id,
          formatted_data: formatResult.formatted_data,
          metadata: fetchResult.metadata,
        }),
      }
    );

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      throw new Error(`Save failed: ${errorText}`);
    }

    const saveResult = await saveResponse.json();

    if (!saveResult.success) {
      throw new Error(`Save failed: ${saveResult.error}`);
    }

    const completedAt = new Date().toISOString();
    const totalItems = saveResult.counts.total || 0;

    await supabase
      .from("integration_sync_history")
      .update({
        status: "success",
        completed_at: completedAt,
        items_synced: totalItems,
      })
      .eq("id", syncHistoryId);

    console.log(`Sync completed successfully. Total items: ${totalItems}`);

    return new Response(
      JSON.stringify({
        success: true,
        config_id,
        config_name: config.config_name,
        integration_type: wandSource.integration_type,
        sync_id: syncHistoryId,
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        counts: saveResult.counts,
        metadata: {
          application_level: config.application_level,
          concept_id: config.concept_id,
          company_id: config.company_id,
          site_id: config.site_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync orchestration error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        error_code: "SYNC_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
