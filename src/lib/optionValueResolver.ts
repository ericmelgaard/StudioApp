import { supabase } from './supabase';
import { ResolvedValue, CalculationPart } from './productValueResolver';

export interface OptionLink {
  type: 'direct' | 'calculation';
  directLink?: {
    mapping_id: string;
    integration_type: 'product' | 'modifier' | 'discount';
    field: string;
  };
  calculation?: CalculationPart[];
  override?: boolean;
  calculated_result?: number;
  last_calculated_at?: string;
}

export interface Option {
  id: string;
  label: string;
  price: number;
  is_active: boolean;
  is_out_of_stock: boolean;
  link?: OptionLink | null;
}

export class OptionValueResolver {
  private integrationDataCache: Map<string, any> = new Map();

  async resolveOptionField(
    option: Option,
    fieldName: string,
    parentIntegrationSourceId: string | null | undefined
  ): Promise<ResolvedValue> {
    if (!option.link) {
      return {
        value: option[fieldName as keyof Option],
        source: 'local'
      };
    }

    if (!parentIntegrationSourceId) {
      return {
        value: option[fieldName as keyof Option],
        source: 'local'
      };
    }

    if (option.link.type === 'direct' && option.link.directLink) {
      const apiValue = await this.fetchFromAPI(
        option.link.directLink.mapping_id,
        parentIntegrationSourceId,
        option.link.directLink.integration_type,
        fieldName === 'price' ? option.link.directLink.field : 'name'
      );

      if (apiValue !== undefined) {
        return {
          value: apiValue,
          source: 'api',
          details: {
            apiMappingId: option.link.directLink.mapping_id
          }
        };
      }
    }

    if (option.link.type === 'calculation' && option.link.calculation) {
      if (option.link.override && fieldName === 'price') {
        return {
          value: option.price,
          source: 'local',
          details: {
            calculationFormula: option.link.calculation
          }
        };
      }

      if (fieldName === 'price') {
        const calculatedValue = await this.calculateValue(
          option.link.calculation,
          parentIntegrationSourceId
        );

        return {
          value: calculatedValue,
          source: 'calculated',
          details: {
            calculationFormula: option.link.calculation
          }
        };
      }
    }

    return {
      value: option[fieldName as keyof Option],
      source: 'local'
    };
  }

  async resolveAllOptions(
    options: Option[],
    parentIntegrationSourceId: string | null | undefined
  ): Promise<Option[]> {
    const resolved: Option[] = [];

    for (const option of options) {
      const resolvedLabel = await this.resolveOptionField(
        option,
        'label',
        parentIntegrationSourceId
      );
      const resolvedPrice = await this.resolveOptionField(
        option,
        'price',
        parentIntegrationSourceId
      );

      resolved.push({
        ...option,
        label: resolvedLabel.value,
        price: resolvedPrice.value
      });
    }

    return resolved;
  }

  async syncOptionFromAPI(
    option: Option,
    parentIntegrationSourceId: string
  ): Promise<Option> {
    if (!option.link || !option.link.directLink) {
      return option;
    }

    const data = await this.fetchFullData(
      option.link.directLink.mapping_id,
      parentIntegrationSourceId,
      option.link.directLink.integration_type
    );

    if (!data) {
      return option;
    }

    return {
      ...option,
      label: data.name || option.label,
      price: this.extractFieldFromData(data, option.link.directLink.field) || option.price
    };
  }

  private async fetchFromAPI(
    mapping_id: string,
    integration_source_id: string,
    integration_type: 'product' | 'modifier' | 'discount',
    fieldName: string
  ): Promise<any> {
    const data = await this.fetchFullData(mapping_id, integration_source_id, integration_type);
    if (!data) return undefined;
    return this.extractFieldFromData(data, fieldName);
  }

  private async fetchFullData(
    mapping_id: string,
    integration_source_id: string,
    integration_type: 'product' | 'modifier' | 'discount'
  ): Promise<any> {
    const cacheKey = `${integration_source_id}:${integration_type}:${mapping_id}`;

    if (this.integrationDataCache.has(cacheKey)) {
      return this.integrationDataCache.get(cacheKey);
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
    return data;
  }

  private extractFieldFromData(data: any, fieldName: string): any {
    if (fieldName === 'name') return data.name;
    if (fieldName === 'description') return data.data?.description;
    if (fieldName === 'price') return data.data?.price;
    if (fieldName === 'data.price') return data.data?.price;

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
    integration_source_id: string
  ): Promise<number> {
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

  clearCache(): void {
    this.integrationDataCache.clear();
  }
}

export const optionValueResolver = new OptionValueResolver();
