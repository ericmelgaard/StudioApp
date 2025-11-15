export type ProductType = 'custom' | 'imported' | 'linked';

export interface ProductWithType {
  integration_product_id?: string | null;
  mapping_id?: string | null;
  local_fields?: string[];
}

export function getProductType(product: ProductWithType): ProductType {
  const hasIntegration = !!(product.integration_product_id || product.mapping_id);
  const hasCustomOverrides = Array.isArray(product.local_fields) && product.local_fields.length > 0;

  if (!hasIntegration) {
    return 'custom';
  }

  if (hasIntegration && hasCustomOverrides) {
    return 'linked';
  }

  return 'imported';
}

export function getProductTypeLabel(type: ProductType): string {
  switch (type) {
    case 'custom':
      return 'Custom';
    case 'imported':
      return 'Imported';
    case 'linked':
      return 'Linked';
  }
}
