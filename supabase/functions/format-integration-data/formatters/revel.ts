import { FormattedData, FormattedProduct } from "./types.ts";

export function formatRevel(data: any): FormattedData {
  const products: FormattedProduct[] = [];
  const modifiers: FormattedProduct[] = [];

  const productItems = data.products || [];
  const modifierItems = data.modifiers || [];

  productItems.forEach((each: any) => {
    if (!each.barcode) {
      return;
    }

    try {
      each.mappingId = each.barcode;
    } catch {
      return;
    }

    try {
      each.category = each.category ? each.category.name : each.modifierClass?.name;
    } catch {
      each.category = "";
    }

    if (typeof each.category === "string") {
      if (
        each.category.includes("OLO") ||
        each.category.includes("3PD") ||
        each.category.includes("3PO")
      ) {
        return;
      }
    }

    products.push(each);
  });

  modifierItems.forEach((each: any) => {
    if (!each.barcode) {
      return;
    }

    try {
      each.mappingId = each.barcode;
    } catch {
      return;
    }

    try {
      each.category = each.modifierClass?.name;
    } catch {
      each.category = "";
    }

    modifiers.push(each);
  });

  return {
    products,
    modifiers,
    discounts: [],
  };
}
