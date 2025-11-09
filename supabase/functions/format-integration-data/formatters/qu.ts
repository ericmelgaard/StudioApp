import { FormattedData, FormattedProduct } from "./types.ts";

export function formatQu(data: any): FormattedData {
  const products: FormattedProduct[] = [];
  const modifiers: FormattedProduct[] = [];
  const discounts: FormattedProduct[] = [];

  const menuItems = data.menuItems || [];
  const modifierItems = data.modifiers || [];
  const discountItems = data.discounts || [];

  // Process menu items (products)
  menuItems.forEach((item: any) => {
    const formatted = formatItem(item);
    if (formatted) {
      products.push(formatted);
    }
  });

  // Process modifiers
  modifierItems.forEach((item: any) => {
    const formatted = formatItem(item);
    if (formatted) {
      modifiers.push(formatted);
    }
  });

  // Process discounts
  discountItems.forEach((item: any) => {
    const formatted = formatItem(item);
    if (formatted) {
      discounts.push(formatted);
    }
  });

  return {
    products: removeDuplicates(products, "mappingId"),
    modifiers: removeDuplicates(modifiers, "mappingId"),
    discounts: removeDuplicates(discounts, "mappingId"),
  };
}

function formatItem(item: any): FormattedProduct | null {
  // Extract category information
  let category = "";
  let categoryId = "";

  if (item.menuCategory) {
    category = item.menuCategory.name || "";
    categoryId = item.menuCategory.id?.toString() || "";
  } else if (item.modifierGroup) {
    category = item.modifierGroup.name || "";
    categoryId = item.modifierGroup.id?.toString() || "";
  }

  // Filter out unwanted categories
  if (category && typeof category === "string") {
    if (
      category.includes("OLO") ||
      category.includes("3PD") ||
      category.includes("3PO") ||
      category.includes("All Items")
    ) {
      return null;
    }
  }

  // Extract price - convert to number or null, never empty string
  let price: number | null = null;
  try {
    const rawPrice = item.discountAmount || item.prices?.prices?.[0]?.price;
    if (rawPrice !== undefined && rawPrice !== null && rawPrice !== "") {
      const parsed = typeof rawPrice === "number" ? rawPrice : parseFloat(rawPrice);
      price = isNaN(parsed) ? null : parsed;
    }
  } catch {
    price = null;
  }

  // Extract mappingId
  let mappingId = "";
  try {
    mappingId = (item.pathId || item.id || "").toString();
  } catch {
    mappingId = "";
  }

  // Extract calories - convert to number or null, never empty string
  let calories: number | null = null;
  try {
    if (item.calories !== undefined && item.calories !== null && item.calories !== "") {
      const parsed = typeof item.calories === "number" ? item.calories : parseFloat(item.calories);
      calories = isNaN(parsed) ? null : parsed;
    }
  } catch {
    calories = null;
  }

  // Create clean formatted object
  return {
    mappingId,
    pathId: item.pathId?.toString() || mappingId,
    name: item.name || "",
    description: item.description || "",
    price: price !== null ? price : 0,
    calories: calories !== null ? calories : 0,
    isOutOfStock: item.isOutOfStock || false,
    category,
    categoryId,
  };
}

function removeDuplicates(array: any[], key: string): any[] {
  const seen = new Map();
  const result: any[] = [];

  array.forEach((item) => {
    const keyValue = item[key];
    if (!seen.has(keyValue)) {
      seen.set(keyValue, item);
      result.push(item);
    } else {
      const existing = seen.get(keyValue);
      if (item.price && item.price !== "0" && (!existing.price || existing.price === "0")) {
        seen.set(keyValue, item);
        const index = result.findIndex((r) => r[key] === keyValue);
        if (index !== -1) {
          result[index] = item;
        }
      }
    }
  });

  return result;
}