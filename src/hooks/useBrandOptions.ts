import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BrandOptionsResult {
  brand: string;
  loading: boolean;
  error: string | null;
  isInherited: boolean;
  inheritedFrom: string | null;
}

/**
 * Hook to resolve brand value for a given integration config or location context
 * Returns the brand value, checking local config first, then parent configs up the hierarchy
 */
export function useBrandOptions(params: {
  configId?: string;
  conceptId?: number;
  companyId?: number;
  siteId?: number;
}): BrandOptionsResult {
  const [brand, setBrand] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInherited, setIsInherited] = useState(false);
  const [inheritedFrom, setInheritedFrom] = useState<string | null>(null);

  useEffect(() => {
    loadBrandValue();
  }, [params.configId, params.conceptId, params.companyId, params.siteId]);

  const loadBrandValue = async () => {
    setLoading(true);
    setError(null);

    try {
      // If configId is provided, load from config
      if (params.configId) {
        await loadFromConfig(params.configId);
      }
      // If location context is provided, load from hierarchy
      else if (params.conceptId || params.companyId || params.siteId) {
        await loadFromLocation();
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading brand value:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFromConfig = async (configId: string) => {
    // Get the config record
    const { data: config, error: configError } = await supabase
      .from('integration_source_configs')
      .select('*, wand_integration_sources(*)')
      .eq('id', configId)
      .single();

    if (configError) throw configError;

    if (!config) {
      throw new Error('Configuration not found');
    }

    // Check if config has a brand in config_params
    if (config.config_params?.brand && config.config_params.brand.trim() !== '') {
      setBrand(config.config_params.brand);
      setIsInherited(false);
      setInheritedFrom(null);
      return;
    }

    // No local brand, look for inherited brand from parent configs
    let conceptId: number | null = null;
    let companyId: number | null = null;

    if (config.application_level === 'concept' && config.concept_id) {
      conceptId = config.concept_id;
    } else if (config.application_level === 'company' && config.company_id) {
      companyId = config.company_id;
      // Get concept from company
      const { data: company } = await supabase
        .from('companies')
        .select('concept_id, concepts(name)')
        .eq('id', config.company_id)
        .single();

      if (company) {
        conceptId = company.concept_id;
      }
    } else if (config.application_level === 'site' && config.site_id) {
      // Get company and concept from site
      const { data: store } = await supabase
        .from('stores')
        .select('company_id, companies(concept_id, concepts(name))')
        .eq('id', config.site_id)
        .single();

      if (store && store.companies) {
        companyId = (store.companies as any).id;
        conceptId = (store.companies as any).concept_id;
      }
    }

    // Look for brand in parent company config
    if (companyId && config.wand_source_id) {
      const { data: parentConfig } = await supabase
        .from('integration_source_configs')
        .select('config_params, config_name')
        .eq('wand_source_id', config.wand_source_id)
        .eq('company_id', companyId)
        .eq('application_level', 'company')
        .maybeSingle();

      if (parentConfig?.config_params?.brand) {
        setBrand(parentConfig.config_params.brand);
        setIsInherited(true);
        setInheritedFrom(parentConfig.config_name || 'company');
        return;
      }
    }

    // Look for brand in parent concept config
    if (conceptId && config.wand_source_id) {
      const { data: conceptConfig } = await supabase
        .from('integration_source_configs')
        .select('config_params, config_name')
        .eq('wand_source_id', config.wand_source_id)
        .eq('concept_id', conceptId)
        .eq('application_level', 'concept')
        .maybeSingle();

      if (conceptConfig?.config_params?.brand) {
        setBrand(conceptConfig.config_params.brand);
        setIsInherited(true);
        setInheritedFrom(conceptConfig.config_name || 'concept');
        return;
      }
    }

    // No brand found anywhere
    setBrand('');
    setIsInherited(false);
    setInheritedFrom(null);
  };

  const loadFromLocation = async () => {
    let conceptId: number | null = null;

    // Direct concept lookup
    if (params.conceptId) {
      conceptId = params.conceptId;
    }
    // Get concept from company
    else if (params.companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('concept_id')
        .eq('id', params.companyId)
        .single();

      if (company) {
        conceptId = company.concept_id;
      }
    }
    // Get concept from site
    else if (params.siteId) {
      const { data: store } = await supabase
        .from('stores')
        .select('company_id, companies(concept_id)')
        .eq('id', params.siteId)
        .single();

      if (store && store.companies) {
        conceptId = (store.companies as any).concept_id;
      }
    }

    // For location-based lookups, we just return empty
    // The actual brand will come from the config itself
    setBrand('');
    setIsInherited(false);
    setInheritedFrom(null);
  };

  return {
    brand,
    loading,
    error,
    isInherited,
    inheritedFrom
  };
}
