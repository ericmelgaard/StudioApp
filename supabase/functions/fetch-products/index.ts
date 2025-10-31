const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Fetch 1 day only to reduce payload size
const API_URL = 'https://api.wanddigital.com/services/webtrition/client/v2/platform?SapCode=27985&Venue=52814&mealPeriod=&MenuDate=2025-10-26&SourceSystem=1&Days=1&IncludeNutrition=false&includeIcons=false&IncludeAllergens=false&IncludeIngredients=false&IncludeRecipe=false';

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

    // Process and slim down the data for products
    const menuItems = data.menuItems || [];
    const modifiers = data.modifiers || [];
    const discounts = data.discounts || [];

    // Group products by MRN and extract only essential fields
    const productsByMrn = new Map();

    menuItems.forEach((item: any) => {
      const mrn = item.mrn;
      if (!productsByMrn.has(mrn)) {
        productsByMrn.set(mrn, {
          mrn: item.mrn,
          external_id: item.externalId,
          name: item.name,
          description: item.description,
          portion: item.portion,
          calories: item.calories,
          price: item.price,
          meal_periods: [],
          meal_stations: [],
        });
      }

      const product = productsByMrn.get(mrn);

      // Add meal period
      if (item.mealPeriod && !product.meal_periods.some((mp: any) =>
        mp.period === item.mealPeriod && mp.date === item.date)) {
        product.meal_periods.push({
          period: item.mealPeriod,
          date: item.date,
        });
      }

      // Add meal station
      if (item.mealStation && !product.meal_stations.some((ms: any) =>
        ms.station === item.mealStation)) {
        product.meal_stations.push({
          station: item.mealStation,
          station_detail: item.mealStationDetail || {},
        });
      }
    });

    const slimmedProducts = Array.from(productsByMrn.values());

    // Slim down modifiers (keep full data structure as-is for now)
    const slimmedModifiers = modifiers.map((mod: any) => ({
      id: mod.id,
      name: mod.name,
      external_id: mod.externalId || String(mod.id),
      modifier_group: mod.modifierGroup,
      display_attribute: mod.displayAttribute,
      price_attribute: mod.priceAttribute,
      item_type: mod.itemType,
    }));

    // Slim down discounts (keep full data structure as-is for now)
    const slimmedDiscounts = discounts.map((disc: any) => ({
      id: disc.id,
      name: disc.name,
      external_id: disc.externalId || String(disc.id),
      discount_type: disc.discountType,
      discount_value: disc.discountValue,
      item_type: disc.itemType,
    }));

    return new Response(
      JSON.stringify({
        menuItems: slimmedProducts,
        modifiers: slimmedModifiers,
        discounts: slimmedDiscounts,
        hasError: false,
        totalCount: {
          products: slimmedProducts.length,
          modifiers: slimmedModifiers.length,
          discounts: slimmedDiscounts.length,
        }
      }),
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
