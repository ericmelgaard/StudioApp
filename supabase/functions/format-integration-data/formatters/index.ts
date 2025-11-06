import { formatQu } from "./qu.ts";
import { formatRevel } from "./revel.ts";
import { formatToast } from "./toast.ts";
import { FormattedData } from "./types.ts";

// Stub formatters for remaining integrations - will implement based on legacy code
function formatPar(data: any): FormattedData {
  const products: any[] = [];
  const modifiers: any[] = [];

  const items = data.items || [];
  const modifierGroups = data.modifier_groups || [];

  items.forEach((each: any) => {
    each.mappingId = each.id?.toString();
    if (each.price === "0") return;
    products.push(each);
  });

  modifierGroups.forEach((group: any) => {
    group.items?.forEach((item: any) => {
      item.category = group.displayName;
      item.mappingId = `${group.id}-${item.itemId}`;
      if (item.category?.toLowerCase().indexOf("olo") > -1 || item.price === "0") return;
      modifiers.push(item);
    });
  });

  return { products, modifiers, discounts: [] };
}

function formatShift(data: any): FormattedData {
  const products: any[] = [];
  const modifiers: any[] = [];

  data.items?.forEach((each: any) => {
    each.mappingId = each.id?.split("-")[0];
    each.category = each.categoryName;
    if (each.modifierCategories?.length > 0) {
      each.modifiers = [];
      data.modifiers?.forEach((mod: any) => {
        if (each.modifierCategories.includes(mod.modifierCategoryId)) {
          const mappingId = `${mod.uniqueId.split("-")[0]}-${mod.uniqueId.split("-")[5]}`;
          each.modifiers.push({ ...mod, mappingId });
          modifiers.push({
            name: mod.name,
            category: mod.modifierCategoryName,
            price: mod.price,
            mappingId,
          });
        }
      });
    }
    products.push(each);
  });

  return { products, modifiers, discounts: [] };
}

function formatSimphony(data: any): FormattedData {
  const products: any[] = [];
  const modifiers: any[] = [];

  const menuItems = data.menuItems || [];

  menuItems.forEach((each: any) => {
    const item: any = {
      mappingId: each.menuItemId?.toString(),
      category: each.familyGroup?.name?.["en-US"],
      name: each.name?.["en-US"],
      price: each.price?.price,
      modifiers: [],
    };

    each.condiments?.forEach((condiment: any) => {
      const def = condiment.definitions?.find((d: any) => d.prices?.[0]?.price > 0);
      item.modifiers.push({
        name: condiment.name?.["en-US"],
        price: def?.prices?.[0]?.price,
        category: item.name,
      });
    });

    products.push(item);
  });

  return { products, modifiers, discounts: [] };
}

function formatTransact(data: any): FormattedData {
  const products: any[] = [];

  (data.data || []).forEach((each: any) => {
    const item: any = {
      mappingId: each["Item Number"],
      category: each["Class"],
      name: each["Label"],
      price: each["Price"] ? parseFloat(String(each["Price"]).replace(/[^0-9.-]+/g, "")).toFixed(2) : "",
    };
    products.push(item);
  });

  return { products, modifiers: [], discounts: [] };
}

function formatClover(data: any): FormattedData {
  const products: any[] = [];
  const modifiers: any[] = [];

  data.menu?.forEach((menu: any) => {
    menu.items?.forEach((item: any) => {
      products.push({
        mappingId: `${menu.id}-${item.id}`,
        name: item.name,
        category: menu.name,
        price: item.price ? (item.price / 100).toFixed(2) : "",
        available: item.available,
      });
    });
  });

  data.mods?.forEach((modGroup: any) => {
    modGroup.modifiers?.forEach((mod: any) => {
      modifiers.push({
        mappingId: `${modGroup.id}-${mod.id}`,
        name: mod.name,
        category: modGroup.name,
        price: mod.price ? (mod.price / 100).toFixed(2) : "",
        available: mod.available,
      });
    });
  });

  return { products, modifiers, discounts: [] };
}

function formatMealtracker(data: any): FormattedData {
  const products: any[] = [];

  (data.data || []).forEach((eachDay: any) => {
    eachDay.menu?.forEach((eachMenu: any) => {
      eachMenu.meals?.forEach((eachMeal: any) => {
        eachMeal.menu?.forEach((eachProduct: any) => {
          products.push({
            ...eachProduct,
            mappingId: eachProduct.id?.toString(),
            day: eachDay.day,
            date: eachDay.date + "T00:00:00",
            menuName: eachMenu.name,
            type: eachMenu.menu_category,
            period: eachMeal.name,
            category: eachProduct.category_name?.replace(/\s+/g, " ").replace(/\s*BLD$/, "").trim(),
          });
        });
      });
    });
  });

  return { products, modifiers: [], discounts: [] };
}

function formatWebtrition(data: any): FormattedData {
  const products: any[] = [];

  (data.menuItems || []).forEach((each: any) => {
    each.category = each.mealStation;
    each.mappingId = each.id?.toString();
    products.push(each);
  });

  return { products, modifiers: [], discounts: [] };
}

function formatBonappetit(data: any): FormattedData {
  const products: any[] = [];

  (data.menuItems || []).forEach((each: any) => {
    each.category = each.station;
    each.mappingId = each.id?.toString();
    each.name = each.label;
    each.date = new Date().toISOString();
    products.push(each);
  });

  return { products, modifiers: [], discounts: [] };
}

function formatBepoz(data: any): FormattedData {
  const products: any[] = [];

  (data.data || []).forEach((each: any) => {
    const item: any = {
      mappingId: (each.menuItemid || "0").toString(),
      category: each.categoryName,
      name: each.menuItemName,
      price: each.Price,
      calories: each.Calorie || "0",
      active: each.Active === "true" || each.Active === true,
      allergens: typeof each.Allergens === "string" ? each.Allergens.split(/[\r\n;,/|]+/).map((a: string) => a.trim()).filter(Boolean) : each.Allergens,
    };
    products.push(item);
  });

  return { products, modifiers: [], discounts: [] };
}

export const formatters: Record<string, (data: any) => FormattedData> = {
  qu: formatQu,
  revel: formatRevel,
  toast: formatToast,
  par: formatPar,
  shift4: formatShift,
  simphony: formatSimphony,
  transact: formatTransact,
  clover: formatClover,
  mealtracker: formatMealtracker,
  webtrition: formatWebtrition,
  bonappetit: formatBonappetit,
  bepoz: formatBepoz,
};
