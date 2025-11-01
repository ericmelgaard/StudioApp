export function resolveAttributePath(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current?.[key]?.[parseInt(index)];
    } else {
      current = current?.[part];
    }

    if (current === undefined) return undefined;
  }

  return current;
}

export function resolveProductAttributes(
  product: any,
  integrationData: any
): Record<string, any> {
  const resolvedAttributes = { ...product.attributes };

  if (!product.attribute_mappings || !integrationData) {
    return resolvedAttributes;
  }

  for (const [attrKey, mappingPath] of Object.entries(product.attribute_mappings)) {
    if (typeof mappingPath === 'string') {
      const resolvedValue = resolveAttributePath(integrationData, mappingPath);
      if (resolvedValue !== undefined) {
        resolvedAttributes[attrKey] = resolvedValue;
      }
    }
  }

  return resolvedAttributes;
}
