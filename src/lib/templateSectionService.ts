import { supabase } from './supabase';

export interface SectionSetting {
  section_id: string;
  section_name: string;
  section_label: string;
  section_type: string;
  section_order: number;
  is_enabled: boolean;
  is_inherited: boolean;
  inherited_from: string;
}

export interface Location {
  concept_id?: number | null;
  company_id?: number | null;
  store_id?: number | null;
}

export interface UpdateSectionSettingParams {
  template_id: string;
  section_id: string;
  is_enabled: boolean;
  location: Location;
}

export class TemplateSectionService {
  static async getEffectiveSectionSettings(
    templateId: string,
    location: Location = {}
  ): Promise<SectionSetting[]> {
    const { data, error } = await supabase.rpc('get_effective_section_settings', {
      p_template_id: templateId,
      p_concept_id: location.concept_id || null,
      p_company_id: location.company_id || null,
      p_store_id: location.store_id || null,
    });

    if (error) {
      console.error('Error fetching effective section settings:', error);
      throw error;
    }

    return data || [];
  }

  static async updateSectionSetting(params: UpdateSectionSettingParams): Promise<void> {
    const { template_id, section_id, is_enabled, location } = params;

    const { concept_id = null, company_id = null, store_id = null } = location;

    const existingSettings = await this.getEffectiveSectionSettings(template_id, location);

    if (!is_enabled) {
      const enabledCount = existingSettings.filter(s => s.is_enabled && s.section_id !== section_id).length;
      if (enabledCount === 0) {
        throw new Error('Cannot disable the last remaining section. At least one section must be enabled.');
      }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('template_section_settings')
      .select('id')
      .eq('template_id', template_id)
      .eq('section_id', section_id)
      .is('concept_id', concept_id)
      .is('company_id', company_id)
      .is('store_id', store_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing setting:', fetchError);
      throw fetchError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('template_section_settings')
        .update({
          is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating section setting:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('template_section_settings')
        .insert({
          template_id,
          section_id,
          is_enabled,
          concept_id,
          company_id,
          store_id,
        });

      if (insertError) {
        console.error('Error inserting section setting:', insertError);
        throw insertError;
      }
    }
  }

  static async bulkUpdateSectionSettings(
    templateId: string,
    sectionIds: string[],
    isEnabled: boolean,
    location: Location = {}
  ): Promise<void> {
    const existingSettings = await this.getEffectiveSectionSettings(templateId, location);

    if (!isEnabled) {
      const remainingEnabledCount = existingSettings.filter(
        s => s.is_enabled && !sectionIds.includes(s.section_id)
      ).length;

      if (remainingEnabledCount === 0) {
        throw new Error('Cannot disable all sections. At least one section must remain enabled.');
      }
    }

    for (const sectionId of sectionIds) {
      await this.updateSectionSetting({
        template_id: templateId,
        section_id: sectionId,
        is_enabled: isEnabled,
        location,
      });
    }
  }

  static async resetToParent(
    templateId: string,
    sectionId: string,
    location: Location
  ): Promise<void> {
    const { concept_id = null, company_id = null, store_id = null } = location;

    const { error } = await supabase
      .from('template_section_settings')
      .delete()
      .eq('template_id', templateId)
      .eq('section_id', sectionId)
      .is('concept_id', concept_id)
      .is('company_id', company_id)
      .is('store_id', store_id);

    if (error) {
      console.error('Error resetting to parent:', error);
      throw error;
    }
  }

  static async getTemplateUsageStats(templateId: string): Promise<{
    productCount: number;
    conceptCount: number;
    companyCount: number;
    storeCount: number;
  }> {
    const { count: productCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', templateId);

    const { data: conceptData } = await supabase
      .from('products')
      .select('concept_id')
      .eq('template_id', templateId)
      .not('concept_id', 'is', null);

    const { data: companyData } = await supabase
      .from('products')
      .select('company_id')
      .eq('template_id', templateId)
      .not('company_id', 'is', null);

    const { data: storeData } = await supabase
      .from('products')
      .select('store_id')
      .eq('template_id', templateId)
      .not('store_id', 'is', null);

    const uniqueConcepts = new Set(conceptData?.map(p => p.concept_id) || []);
    const uniqueCompanies = new Set(companyData?.map(p => p.company_id) || []);
    const uniqueStores = new Set(storeData?.map(p => p.store_id) || []);

    return {
      productCount: productCount || 0,
      conceptCount: uniqueConcepts.size,
      companyCount: uniqueCompanies.size,
      storeCount: uniqueStores.size,
    };
  }

  static getLocationLevel(location: Location): 'wand' | 'concept' | 'company' | 'store' {
    if (location.store_id) return 'store';
    if (location.company_id) return 'company';
    if (location.concept_id) return 'concept';
    return 'wand';
  }

  static getLocationDisplay(location: Location): string {
    const level = this.getLocationLevel(location);
    switch (level) {
      case 'store':
        return 'Store Level';
      case 'company':
        return 'Company Level';
      case 'concept':
        return 'Concept Level';
      case 'wand':
        return 'WAND Level';
      default:
        return 'Unknown Level';
    }
  }

  static async getAttributeSections(): Promise<any[]> {
    const { data, error } = await supabase
      .from('attribute_sections')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error fetching attribute sections:', error);
      throw error;
    }

    return data || [];
  }

  static async addAttributeToTemplate(
    templateId: string,
    sectionId: string,
    attribute: {
      name: string;
      label: string;
      type: string;
      required: boolean;
    }
  ): Promise<void> {
    const { data: template, error: fetchError } = await supabase
      .from('product_attribute_templates')
      .select('attribute_schema')
      .eq('id', templateId)
      .single();

    if (fetchError) throw fetchError;

    const updatedSchema = { ...template.attribute_schema };

    const { error: updateError } = await supabase
      .from('product_attribute_templates')
      .update({ attribute_schema: updatedSchema })
      .eq('id', templateId);

    if (updateError) throw updateError;
  }

  static async removeAttributeFromTemplate(
    templateId: string,
    sectionId: string,
    attributeName: string
  ): Promise<void> {
    const { data: template, error: fetchError } = await supabase
      .from('product_attribute_templates')
      .select('attribute_schema')
      .eq('id', templateId)
      .single();

    if (fetchError) throw fetchError;

    const updatedSchema = { ...template.attribute_schema };

    const { error: updateError } = await supabase
      .from('product_attribute_templates')
      .update({ attribute_schema: updatedSchema })
      .eq('id', templateId);

    if (updateError) throw updateError;
  }

  static async linkAttributeToSection(
    attributeId: string,
    sectionId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('available_attributes')
      .update({ section_id: sectionId })
      .eq('id', attributeId);

    if (error) {
      console.error('Error linking attribute to section:', error);
      throw error;
    }
  }
}
