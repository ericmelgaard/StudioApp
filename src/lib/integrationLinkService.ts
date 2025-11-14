import { supabase } from './supabase';
import { Product, CalculationPart } from './productValueResolver';
import { Option, OptionLink } from './optionValueResolver';

export class IntegrationLinkService {
  async linkProduct(
    productId: string,
    mapping_id: string,
    integration_source_id: string,
    integration_type: 'product' | 'modifier' | 'discount'
  ): Promise<void> {
    const exists = await this.checkMappingExists(
      mapping_id,
      integration_source_id,
      integration_type
    );

    if (!exists) {
      throw new Error('Mapping not found in integration catalog');
    }

    const { error } = await supabase
      .from('products')
      .update({
        mapping_id,
        integration_source_id,
        integration_type,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to link product: ${error.message}`);
    }
  }

  async unlinkProduct(productId: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({
        mapping_id: null,
        integration_source_id: null,
        integration_type: null,
        last_synced_at: null
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to unlink product: ${error.message}`);
    }
  }

  async linkOption(
    productId: string,
    optionId: string,
    mapping_id: string,
    integration_type: 'product' | 'modifier' | 'discount'
  ): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    if (!product.integration_source_id) {
      throw new Error('Cannot link option: product not linked to API source');
    }

    const exists = await this.checkMappingExists(
      mapping_id,
      product.integration_source_id,
      integration_type
    );

    if (!exists) {
      throw new Error('Mapping not found in product\'s integration source');
    }

    const options = product.attributes?.options || [];
    const optionIndex = options.findIndex((o: Option) => o.id === optionId);

    if (optionIndex === -1) {
      throw new Error('Option not found');
    }

    const integrationData = await this.fetchIntegrationData(
      mapping_id,
      product.integration_source_id,
      integration_type
    );

    options[optionIndex] = {
      ...options[optionIndex],
      label: integrationData?.name || options[optionIndex].label,
      price: integrationData?.data?.price || options[optionIndex].price,
      link: {
        type: 'direct',
        directLink: {
          mapping_id,
          integration_type,
          field: 'data.price'
        }
      }
    };

    const { error } = await supabase
      .from('products')
      .update({
        attributes: {
          ...product.attributes,
          options
        }
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to link option: ${error.message}`);
    }
  }

  async unlinkOption(productId: string, optionId: string): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    const options = product.attributes?.options || [];
    const optionIndex = options.findIndex((o: Option) => o.id === optionId);

    if (optionIndex === -1) {
      throw new Error('Option not found');
    }

    options[optionIndex] = {
      ...options[optionIndex],
      link: null
    };

    const { error } = await supabase
      .from('products')
      .update({
        attributes: {
          ...product.attributes,
          options
        }
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to unlink option: ${error.message}`);
    }
  }

  async setCalculation(
    productId: string,
    fieldName: string,
    formula: CalculationPart[]
  ): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    const priceCalculations = product.price_calculations || {};
    priceCalculations[fieldName] = formula;

    const { error } = await supabase
      .from('products')
      .update({
        price_calculations: priceCalculations
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to set calculation: ${error.message}`);
    }
  }

  async setOptionCalculation(
    productId: string,
    optionId: string,
    formula: CalculationPart[]
  ): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    const options = product.attributes?.options || [];
    const optionIndex = options.findIndex((o: Option) => o.id === optionId);

    if (optionIndex === -1) {
      throw new Error('Option not found');
    }

    options[optionIndex] = {
      ...options[optionIndex],
      link: {
        type: 'calculation',
        calculation: formula
      }
    };

    const { error } = await supabase
      .from('products')
      .update({
        attributes: {
          ...product.attributes,
          options
        }
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to set option calculation: ${error.message}`);
    }
  }

  async clearLocalOverride(productId: string, fieldName: string): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    const localFields = (product.local_fields || []).filter((f: string) => f !== fieldName);
    const attributes = { ...product.attributes };
    delete attributes[fieldName];

    const { error } = await supabase
      .from('products')
      .update({
        local_fields: localFields,
        attributes
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to clear override: ${error.message}`);
    }
  }

  async enableLocalOverride(productId: string, fieldName: string, value: any): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    const localFields = product.local_fields || [];
    if (!localFields.includes(fieldName)) {
      localFields.push(fieldName);
    }

    const attributes = {
      ...product.attributes,
      [fieldName]: value
    };

    const { error } = await supabase
      .from('products')
      .update({
        local_fields: localFields,
        attributes
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to enable override: ${error.message}`);
    }
  }

  async clearCalculationOverride(productId: string, optionId: string): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    const options = product.attributes?.options || [];
    const optionIndex = options.findIndex((o: Option) => o.id === optionId);

    if (optionIndex === -1) {
      throw new Error('Option not found');
    }

    const option = options[optionIndex];
    if (option.link?.calculation) {
      delete option.link.override;
      if (option.link.calculated_result !== undefined) {
        option.price = option.link.calculated_result;
      }
    }

    const { error } = await supabase
      .from('products')
      .update({
        attributes: {
          ...product.attributes,
          options
        }
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to clear calculation override: ${error.message}`);
    }
  }

  async setCalculationOverride(
    productId: string,
    optionId: string,
    fixedPrice: number
  ): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    const options = product.attributes?.options || [];
    const optionIndex = options.findIndex((o: Option) => o.id === optionId);

    if (optionIndex === -1) {
      throw new Error('Option not found');
    }

    const option = options[optionIndex];
    if (option.link?.calculation) {
      option.link.override = true;
      option.price = fixedPrice;
    }

    const { error } = await supabase
      .from('products')
      .update({
        attributes: {
          ...product.attributes,
          options
        }
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to set calculation override: ${error.message}`);
    }
  }

  private async checkMappingExists(
    mapping_id: string,
    integration_source_id: string,
    integration_type: 'product' | 'modifier' | 'discount'
  ): Promise<boolean> {
    const tableName = integration_type === 'product'
      ? 'integration_products'
      : integration_type === 'modifier'
      ? 'integration_modifiers'
      : 'integration_discounts';

    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('mapping_id', mapping_id)
      .eq('wand_source_id', integration_source_id)
      .maybeSingle();

    return !error && data !== null;
  }

  private async fetchIntegrationData(
    mapping_id: string,
    integration_source_id: string,
    integration_type: 'product' | 'modifier' | 'discount'
  ): Promise<any> {
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
      return null;
    }

    return data;
  }
}

export const integrationLinkService = new IntegrationLinkService();
