import { FormattedData, FormattedProduct } from "./types.ts";

export function formatToast(data: any): FormattedData {
  const menuItems: any[] = [];

  data.modifierGroupReferences = Object.values(data.modifierGroupReferences || {});
  data.modifierOptionReferences = Object.values(data.modifierOptionReferences || {});

  function flattenMenus(array: any[]): any[] {
    const result: any[] = [];
    array.forEach((a) => {
      if (a.menuGroups) {
        a.menuGroups.forEach((each: any) => {
          each.menu = a.name;
          each.menuId = a.masterId;
        });
      }
      result.push(a);
      if (Array.isArray(a.menuGroups)) {
        result.push(...flattenMenus(a.menuGroups));
      }
    });
    return result;
  }

  const groups = flattenMenus(data.menus || []);

  groups.forEach((group) => {
    if (!group.menuItems) {
      return;
    }

    group.menuItems.forEach((item: any) => {
      item.category = group.name;
      item.menu = group.menu;
      item.menuId = group.menuId;
      item.groupId = group.multiLocationId;
      item.mappingId = item.multiLocationId;
      item.active = true;
      item.modifiers = [];
      item.price = item.price ? parseFloat(item.price).toFixed(2) : "";

      try {
        item.modifierGroupReferences?.forEach((modGroup: any, idx: number) => {
          data.modifierGroupReferences.forEach((modRef: any) => {
            if (modGroup === modRef.referenceId) {
              item.modifiers.push({
                modifierType: modRef.name,
                masterId: modRef.masterId,
                options: [],
              });

              data.modifierOptionReferences.forEach((modRefOpt: any) => {
                modRef.modifierOptionReferences?.forEach((modOptRef: any) => {
                  if (modOptRef === modRefOpt.referenceId) {
                    item.modifiers[idx].options.push({
                      name: modRefOpt.name,
                      price: parseFloat(modRefOpt.price || 0).toFixed(2),
                      masterId: modRefOpt.masterId,
                      calories: modRefOpt.calories,
                      description: modRefOpt.description,
                    });
                  }
                });
              });
            }
          });
        });
      } catch {
        // Continue if modifiers fail
      }

      menuItems.push(item);
    });
  });

  return {
    products: menuItems,
    modifiers: [],
    discounts: [],
  };
}
