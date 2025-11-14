import { supabase } from './supabase';
import { resolveProductAttributes } from './attributeResolver';

interface LocationState {
  concept?: { id: number };
  company?: { id: number };
  group?: { id: number };
  store?: { id: number };
}

export class LocationProductService {
  static async getOrCreateLocationProduct(
    parentProductId: string,
    location: LocationState
  ): Promise<{ id: string; attributes: any } | null> {
    if (!location.concept && !location.company && !location.store) {
      return null;
    }

    const conceptId = location.concept?.id || null;
    const companyId = location.company?.id || null;
    const siteId = location.store?.id || null;

    const { data: existingProduct } = await supabase
      .from('products')
      .select('*')
      .eq('parent_product_id', parentProductId)
      .eq('concept_id', conceptId || null)
      .eq('company_id', companyId || null)
      .eq('site_id', siteId || null)
      .maybeSingle();

    if (existingProduct) {
      return existingProduct;
    }

    const { data: parentProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', parentProductId)
      .single();

    if (!parentProduct) {
      return null;
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        name: parentProduct.name,
        attributes: {},
        attribute_template_id: parentProduct.attribute_template_id,
        display_template_id: parentProduct.display_template_id,
        parent_product_id: parentProductId,
        concept_id: conceptId,
        company_id: companyId,
        site_id: siteId,
        local_fields: [],
        mapping_id: null,
        integration_source_id: null,
        integration_type: null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating location product:', error);
      return null;
    }

    return newProduct;
  }

  static async enableLocationOverride(
    productId: string,
    fieldName: string,
    value: any,
    location: LocationState
  ): Promise<boolean> {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      return false;
    }

    const isRootProduct = !product.parent_product_id &&
                          !product.concept_id &&
                          !product.company_id &&
                          !product.site_id;

    if (isRootProduct && (location.concept || location.company || location.store)) {
      const locationProduct = await this.getOrCreateLocationProduct(productId, location);

      if (!locationProduct) {
        return false;
      }

      const updatedAttributes = {
        ...locationProduct.attributes,
        [fieldName]: value
      };

      const localFields = [...(locationProduct.local_fields || [])];
      if (!localFields.includes(fieldName)) {
        localFields.push(fieldName);
      }

      const { error } = await supabase
        .from('products')
        .update({
          attributes: updatedAttributes,
          local_fields: localFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', locationProduct.id);

      return !error;
    } else {
      const updatedAttributes = {
        ...product.attributes,
        [fieldName]: value
      };

      const localFields = [...(product.local_fields || [])];
      if (!localFields.includes(fieldName)) {
        localFields.push(fieldName);
      }

      const { error } = await supabase
        .from('products')
        .update({
          attributes: updatedAttributes,
          local_fields: localFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      return !error;
    }
  }

  static async clearLocationOverride(
    productId: string,
    fieldName: string
  ): Promise<boolean> {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product || !product.parent_product_id) {
      return false;
    }

    const localFields = (product.local_fields || []).filter((f: string) => f !== fieldName);

    const { data: parentProduct } = await supabase
      .from('products')
      .select('attributes')
      .eq('id', product.parent_product_id)
      .single();

    if (!parentProduct) {
      return false;
    }

    const updatedAttributes = {
      ...product.attributes,
      [fieldName]: parentProduct.attributes[fieldName]
    };

    const { error } = await supabase
      .from('products')
      .update({
        attributes: updatedAttributes,
        local_fields: localFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    return !error;
  }

  static async getProductForLocation(
    productId: string,
    location: LocationState
  ): Promise<any> {
    if (!location.concept && !location.company && !location.store) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      return data;
    }

    const conceptId = location.concept?.id || null;
    const companyId = location.company?.id || null;
    const siteId = location.store?.id || null;

    const { data: locationProduct } = await supabase
      .from('products')
      .select('*')
      .eq('parent_product_id', productId)
      .eq('concept_id', conceptId || null)
      .eq('company_id', companyId || null)
      .eq('site_id', siteId || null)
      .maybeSingle();

    if (locationProduct) {
      return locationProduct;
    }

    const { data: rootProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    return rootProduct;
  }

  static async resolveProductWithInheritance(
    product: any,
    integrationDataMap?: Map<string, any>
  ): Promise<any> {
    if (!product.parent_product_id) {
      if (product.integration_product_id && product.attribute_mappings) {
        const integrationData = integrationDataMap?.get(product.integration_product_id);
        if (integrationData) {
          return {
            ...product,
            attributes: resolveProductAttributes(product, integrationData)
          };
        }
      }
      return product;
    }

    const { data: parentProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', product.parent_product_id)
      .single();

    if (!parentProduct) {
      return product;
    }

    let parentAttributes = { ...parentProduct.attributes };

    if (parentProduct.integration_product_id && parentProduct.attribute_mappings) {
      const integrationData = integrationDataMap?.get(parentProduct.integration_product_id);
      if (integrationData) {
        parentAttributes = resolveProductAttributes(parentProduct, integrationData);
      }
    }

    const mergedAttributes = {
      ...parentAttributes,
      ...product.attributes
    };

    return {
      ...product,
      attributes: mergedAttributes,
      mapping_id: parentProduct.mapping_id,
      integration_source_id: parentProduct.integration_source_id,
      integration_product_id: parentProduct.integration_product_id,
      attribute_mappings: parentProduct.attribute_mappings
    };
  }
}
