import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { formatters } from "./formatters/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FormatRequest {
  integration_type: string;
  data: any;
  config_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { integration_type, data, config_id }: FormatRequest = await req.json();

    if (!integration_type) {
      throw new Error("integration_type is required");
    }

    if (!data) {
      throw new Error("data is required");
    }

    const formatter = formatters[integration_type];

    if (!formatter) {
      throw new Error(`No formatter found for integration type: ${integration_type}`);
    }

    console.log(`Formatting data for integration type: ${integration_type}`);

    const formattedData = formatter(data);

    return new Response(
      JSON.stringify({
        success: true,
        integration_type,
        config_id,
        formatted_data: formattedData,
        counts: {
          products: formattedData.products.length,
          modifiers: formattedData.modifiers.length,
          discounts: formattedData.discounts.length,
        },
        formatted_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error formatting integration data:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        error_code: "FORMAT_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
