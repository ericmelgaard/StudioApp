import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SaveRequest {
  config_id: string;
  source_id: string;
  formatted_data: {
    products: any[];
    modifiers: any[];
    discounts: any[];
  };
  metadata?: {
    application_level: string;
    concept_id?: number;
    company_id?: number;
    site_id?: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { config_id, source_id, formatted_data, metadata }: SaveRequest = await req.json();

    if (!config_id || !source_id || !formatted_data) {
      throw new Error("config_id, source_id, and formatted_data are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    let productsInserted = 0;
    let modifiersInserted = 0;
    let discountsInserted = 0;

    console.log("Received formatted_data counts:");
    console.log(`  Products: ${formatted_data.products?.length || 0}`);
    console.log(`  Modifiers: ${formatted_data.modifiers?.length || 0}`);
    console.log(`  Discounts: ${formatted_data.discounts?.length || 0}`);

    if (formatted_data.products && formatted_data.products.length > 0) {
      const productsToInsert = formatted_data.products.map((product) => ({
        source_id: source_id,
        source_config_id: config_id,
        external_id: product.mappingId || product.id || product.external_id,
        path_id: product.pathId || product.path_id,
        name: product.name,
        item_type: product.item_type || product.itemType || "product",
        data: product,
        last_synced_at: now,
        concept_id: metadata?.concept_id,
        company_id: metadata?.company_id,
        site_id: metadata?.site_id,
      }));

      const { data: insertedProducts, error: productsError } = await supabase
        .from("integration_products")
        .upsert(productsToInsert, {
          onConflict: "source_id,external_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (productsError) {
        console.error("Error inserting products:", productsError);
        throw new Error(`Failed to insert products: ${productsError.message}`);
      }

      productsInserted = insertedProducts?.length || 0;
    }

    if (formatted_data.modifiers && formatted_data.modifiers.length > 0) {
      const modifiersToInsert = formatted_data.modifiers.map((modifier) => ({
        source_id: source_id,
        source_config_id: config_id,
        external_id: modifier.mappingId || modifier.id || modifier.external_id,
        path_id: modifier.pathId || modifier.path_id,
        name: modifier.name,
        modifier_group_id: modifier.modifierGroupId || modifier.modifier_group_id,
        modifier_group_name: modifier.category || modifier.modifierGroupName || modifier.modifier_group_name,
        data: modifier,
        last_synced_at: now,
        concept_id: metadata?.concept_id,
        company_id: metadata?.company_id,
        site_id: metadata?.site_id,
      }));

      const { data: insertedModifiers, error: modifiersError } = await supabase
        .from("integration_modifiers")
        .upsert(modifiersToInsert, {
          onConflict: "source_id,external_id,path_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (modifiersError) {
        console.error("Error inserting modifiers:", modifiersError);
        throw new Error(`Failed to insert modifiers: ${modifiersError.message}`);
      }

      modifiersInserted = insertedModifiers?.length || 0;
    }

    if (formatted_data.discounts && formatted_data.discounts.length > 0) {
      const discountsToInsert = formatted_data.discounts.map((discount) => {
        // Handle discount_amount - ensure it's a valid number or null, never empty string
        let discountAmount = discount.discountAmount || discount.discount_amount || discount.price;
        if (discountAmount === "" || discountAmount === undefined) {
          discountAmount = null;
        } else if (typeof discountAmount === "string") {
          const parsed = parseFloat(discountAmount);
          discountAmount = isNaN(parsed) ? null : parsed;
        }

        return {
          source_id: source_id,
          source_config_id: config_id,
          external_id: discount.mappingId || discount.id || discount.external_id,
          name: discount.name,
          discount_amount: discountAmount,
          data: discount,
          last_synced_at: now,
          concept_id: metadata?.concept_id,
          company_id: metadata?.company_id,
          site_id: metadata?.site_id,
        };
      });

      const { data: insertedDiscounts, error: discountsError } = await supabase
        .from("integration_discounts")
        .upsert(discountsToInsert, {
          onConflict: "source_id,external_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (discountsError) {
        console.error("Error inserting discounts:", discountsError);
        throw new Error(`Failed to insert discounts: ${discountsError.message}`);
      }

      discountsInserted = insertedDiscounts?.length || 0;
    }

    await supabase
      .from("integration_source_configs")
      .update({
        last_sync_at: now,
        last_sync_status: "success",
      })
      .eq("id", config_id);

    return new Response(
      JSON.stringify({
        success: true,
        config_id,
        source_id,
        counts: {
          products: productsInserted,
          modifiers: modifiersInserted,
          discounts: discountsInserted,
          total: productsInserted + modifiersInserted + discountsInserted,
        },
        saved_at: now,
        metadata,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error saving integration data:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        error_code: "SAVE_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
