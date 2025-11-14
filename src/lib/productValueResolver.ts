import { supabase } from './supabase';

export interface ResolvedValue {
  value: any;
  source: 'local' | 'api' | 'calculated' | 'parent' | 'template' | 'default';
  details?: {
    apiMappingId?: string;
    parentProductId?: string;
    templateId?: string;
    calculationFormula?: any;
    lastSyncedAt?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  mapping_id?: string | null;
  integration_source_id?: string | null;
  integration_type?: 'product' | 'modifier' | 'discount' | null;
  parent_product_id?: string | null;
  local_fields?: string[];
  price_calculations?: Record<string, any>;
  attribute_template_id?: string | null;
  last_synced_at?: string | null;
}

export interface CalculationPart {
  mapping_id: string;
  integration_type: 'product' | 'modifier' | 'discount';
  field_path: string;
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
}

export class ProductValueResolver {
  private integrationDataCache: Map<string, any> = new Map();
  private productCache: Map<string, Product> = new Map();

  async resolveField(product: Product, fieldName: string): Promise<ResolvedValue> {
    if (fieldName === 'options') {
      return {
        value: product.attributes.options || [],
        source: 'local'
      };
    }

    if (product.local_fields?.includes(fieldName)) {
      return {
        value: product.attributes[fieldName],
        source: 'local'
      };
    }

    if (product.price_calculations?.[fieldName]) {
      const calculatedValue = await this.calculateValue(
        product.price_calculations[fieldName],
        product.integration_source_id
      );
      return {
        value: calculatedValue,
        source: 'calculated',
        details: {
          calculationFormula: product.price_calculations[fieldName]
        }
      };
    }

    if (product.mapping_id && product.integration_source_id) {
      const apiValue = await this.fetchFromAPI(
        product.mapping_id,
        product.integration_source_id,
        product.integration_type || 'product',
        fieldName
      );

      if (apiValue !== undefined) {
        return {
          value: apiValue,
          source: 'api',
          details: {
            apiMappingId: product.mapping_id,
            lastSyncedAt: product.last_synced_at || undefined
          }
        };
      }
    }

    if (product.parent_product_id) {
      const parent = await this.getProduct(product.parent_product_id);
      if (parent) {
        const parentValue = await this.resolveField(parent, fieldName);
        return {
          ...parentValue,
          source: 'parent',
          details: {
            ...parentValue.details,
            parentProductId: product.parent_product_id
          }
        };
      }
    }

    if (product.attribute_template_id) {
      const templateValue = await this.getTemplateDefault(
        product.attribute_template_id,
        fieldName
      );
      if (templateValue !== undefined) {
        return {
          value: templateValue,
          source: 'template',
          details: {
            templateId: product.attribute_template_id
          }
        };
      }
    }

    return {
      value: product.attributes[fieldName],
      source: 'default'
    };
  }

  async resolveAllFields(product: Product): Promise<Record<string, ResolvedValue>> {
    const resolved: Record<string, ResolvedValue> = {};

    const allFieldNames = new Set([
      ...Object.keys(product.attributes),
      ...(product.local_fields || []),
      ...Object.keys(product.price_calculations || {})
    ]);

    for (const fieldName of allFieldNames) {
      if (fieldName === 'options') continue;
      resolved[fieldName] = await this.resolveField(product, fieldName);
    }

    return resolved;
  }

  private async fetchFromAPI(
    mapping_id: string,
    integration_source_id: string,
    integration_type: 'product' | 'modifier' | 'discount',
    fieldName: string
  ): Promise<any> {
    const cacheKey = `${integration_source_id}:${integration_type}:${mapping_id}`;

    if (this.integrationDataCache.has(cacheKey)) {
      const cached = this.integrationDataCache.get(cacheKey);
      return this.extractFieldFromData(cached, fieldName);
    }

    const tableName = integration_type === 'product'
      ? 'integration_products'
      : integration_type === 'modifier'
      ? 'integration_modifiers'
      : 'integration_discounts';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('mapping_id', mapping_id)
      .eq('wand_source_id', integration_source_id)
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    this.integrationDataCache.set(cacheKey, data);
    return this.extractFieldFromData(data, fieldName);
  }

  private extractFieldFromData(data: any, fieldName: string): any {
    if (fieldName === 'name') return data.name;
    if (fieldName === 'description') return data.data?.description;
    if (fieldName === 'price') return data.data?.price;
    if (fieldName === 'image_url') return data.data?.image_url;

    if (fieldName.startsWith('data.')) {
      const path = fieldName.substring(5).split('.');
      let value = data.data;
      for (const key of path) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          return undefined;
        }
      }
      return value;
    }

    return data[fieldName];
  }

  private async calculateValue(
    formula: CalculationPart[],
    integration_source_id: string | null | undefined
  ): Promise<number> {
    if (!integration_source_id) return 0;

    let result = 0;
    let isFirst = true;

    for (const part of formula) {
      const value = await this.fetchFromAPI(
        part.mapping_id,
        integration_source_id,
        part.integration_type,
        part.field_path
      );

      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;

      if (isFirst && part.operation === 'add') {
        result = numValue;
        isFirst = false;
      } else if (part.operation === 'add') {
        result += numValue;
      } else if (part.operation === 'subtract') {
        result -= numValue;
      } else if (part.operation === 'multiply') {
        result *= numValue;
      } else if (part.operation === 'divide') {
        result = numValue !== 0 ? result / numValue : result;
      }
    }

    return result;
  }

  private async getProduct(productId: string): Promise<Product | null> {
    if (this.productCache.has(productId)) {
      return this.productCache.get(productId) || null;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    this.productCache.set(productId, data as Product);
    return data as Product;
  }

  private async getTemplateDefault(
    templateId: string,
    fieldName: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from('attribute_templates')
      .select('default_values')
      .eq('id', templateId)
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return data.default_values?.[fieldName];
  }

  clearCache(): void {
    this.integrationDataCache.clear();
    this.productCache.clear();
  }
}

export const productValueResolver = new ProductValueResolver();
