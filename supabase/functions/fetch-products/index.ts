const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_URL = 'https://api.wanddigital.com/services/webtrition/client/v2/platform?SapCode=27985&Venue=52814&mealPeriod=&MenuDate=2025-10-26&SourceSystem=1&Days=7&IncludeNutrition=false&includeIcons=false&IncludeAllergens=false&IncludeIngredients=false&IncludeRecipe=false';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error fetching products:', error);

    return new Response(
      JSON.stringify({
        hasError: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'FETCH_ERROR'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
