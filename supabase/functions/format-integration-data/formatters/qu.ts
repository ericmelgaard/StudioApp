import { FormattedData, FormattedProduct } from "./types.ts";

export function formatQu(data: any): FormattedData {
  const products: FormattedProduct[] = [];
  const modifiers: FormattedProduct[] = [];
  const discounts: FormattedProduct[] = [];

  const menuItems = data.menuItems || [];
  const modifierItems = data.modifiers || [];
  const discountItems = data.discounts || [];

  menuItems.forEach((eachItem: any) => {
    if (eachItem.menuCategory) {
      eachItem.category = eachItem.menuCategory.name;
      eachItem.categoryId = eachItem.menuCategory.id;
    }
    if (eachItem.modifierGroup) {
      eachItem.category = eachItem.modifierGroup.name;
      eachItem.categoryId = eachItem.modifierGroup.id;
    }

    if (typeof eachItem.category === "string") {
      if (
        eachItem.category.includes("OLO") ||
        eachItem.category.includes("3PD") ||
        eachItem.category.includes("3PO") ||
        eachItem.category.includes("All Items")
      ) {
        return;
      }
    }

    try {
      eachItem.price = eachItem.discountAmount
        ? eachItem.discountAmount
        : eachItem.prices?.prices?.[0]?.price;
    } catch {
      eachItem.price = "";
    }

    try {
      eachItem.mappingId = eachItem.pathId || eachItem.id || "";
      eachItem.mappingId = eachItem.mappingId.toString();
    } catch {
      eachItem.mappingId = null;
    }

    delete eachItem.prices;
    delete eachItem.displayAttribute;
    products.push(eachItem);
  });

  modifierItems.forEach((eachItem: any) => {
    if (eachItem.modifierGroup) {
      eachItem.category = eachItem.modifierGroup.name;
      eachItem.categoryId = eachItem.modifierGroup.id;
    }

    try {
      eachItem.price = eachItem.prices?.prices?.[0]?.price;
    } catch {
      eachItem.price = "";
    }

    try {
      eachItem.mappingId = eachItem.pathId || eachItem.id || "";
      eachItem.mappingId = eachItem.mappingId.toString();
    } catch {
      eachItem.mappingId = null;
    }

    delete eachItem.prices;
    delete eachItem.displayAttribute;
    modifiers.push(eachItem);
  });

  discountItems.forEach((item: any) => {
    item.mappingId = item.id?.toString();
    item.price = item.discountAmount;
    discounts.push(item);
  });

  return {
    products: removeDuplicates(products, "mappingId"),
    modifiers: removeDuplicates(modifiers, "mappingId"),
    discounts,
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
