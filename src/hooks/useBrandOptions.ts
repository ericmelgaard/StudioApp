import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BrandOptionsResult {
  brands: string[];
  loading: boolean;
  error: string | null;
  isInherited: boolean;
  conceptName: string | null;
  canOverride: boolean;
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
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInherited, setIsInherited] = useState(false);
  const [conceptName, setConceptName] = useState<string | null>(null);
  const [canOverride, setCanOverride] = useState(false);

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

    // Check if config has local brand_options array
    if (config.brand_options && Array.isArray(config.brand_options) && config.brand_options.length > 0) {
      setBrands(config.brand_options);
      setIsInherited(false);
      setConceptName(null);
      setCanOverride(false);
      return;
    }

    // Check if config has a single brand in config_params (legacy support)
    if (config.config_params?.brand && config.config_params.brand.trim() !== '') {
      setBrands([config.config_params.brand]);
      setIsInherited(false);
      setConceptName(null);
      setCanOverride(false);
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
        .select('config_params, config_name, brand_options')
        .eq('wand_source_id', config.wand_source_id)
        .eq('company_id', companyId)
        .eq('application_level', 'company')
        .maybeSingle();

      if (parentConfig?.brand_options && Array.isArray(parentConfig.brand_options) && parentConfig.brand_options.length > 0) {
        setBrands(parentConfig.brand_options);
        setIsInherited(true);
        setConceptName(parentConfig.config_name || 'Company');
        setCanOverride(config.application_level === 'site');
        return;
      }

      // Legacy: check config_params.brand
      if (parentConfig?.config_params?.brand) {
        setBrands([parentConfig.config_params.brand]);
        setIsInherited(true);
        setConceptName(parentConfig.config_name || 'Company');
        setCanOverride(config.application_level === 'site');
        return;
      }
    }

    // Look for brand in parent concept config
    if (conceptId && config.wand_source_id) {
      const { data: conceptConfig } = await supabase
        .from('integration_source_configs')
        .select('config_params, config_name, brand_options, concepts(name)')
        .eq('wand_source_id', config.wand_source_id)
        .eq('concept_id', conceptId)
        .eq('application_level', 'concept')
        .maybeSingle();

      if (conceptConfig?.brand_options && Array.isArray(conceptConfig.brand_options) && conceptConfig.brand_options.length > 0) {
        setBrands(conceptConfig.brand_options);
        setIsInherited(true);
        setConceptName((conceptConfig.concepts as any)?.name || conceptConfig.config_name || 'Concept');
        setCanOverride(config.application_level === 'site' || config.application_level === 'company');
        return;
      }

      // Legacy: check config_params.brand
      if (conceptConfig?.config_params?.brand) {
        setBrands([conceptConfig.config_params.brand]);
        setIsInherited(true);
        setConceptName((conceptConfig.concepts as any)?.name || conceptConfig.config_name || 'Concept');
        setCanOverride(config.application_level === 'site' || config.application_level === 'company');
        return;
      }
    }

    // No brand found anywhere
    setBrands([]);
    setIsInherited(false);
    setConceptName(null);
    setCanOverride(config.application_level === 'site' || config.application_level === 'company');
  };

  const loadFromLocation = async () => {
    let conceptId: number | null = null;
    let conceptNameValue: string | null = null;

    // Direct concept lookup
    if (params.conceptId) {
      conceptId = params.conceptId;
      const { data: concept } = await supabase
        .from('concepts')
        .select('name')
        .eq('id', params.conceptId)
        .maybeSingle();

      if (concept) {
        conceptNameValue = concept.name;
      }
    }
    // Get concept from company
    else if (params.companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('concept_id, concepts(name)')
        .eq('id', params.companyId)
        .maybeSingle();

      if (company) {
        conceptId = company.concept_id;
        conceptNameValue = (company.concepts as any)?.name || null;
      }
    }
    // Get concept from site
    else if (params.siteId) {
      const { data: store } = await supabase
        .from('stores')
        .select('company_id, companies(concept_id, concepts(name))')
        .eq('id', params.siteId)
        .maybeSingle();

      if (store && store.companies) {
        conceptId = (store.companies as any).concept_id;
        conceptNameValue = (store.companies as any).concepts?.name || null;
      }
    }

    // Determine if user can override based on their level
    const userCanOverride = Boolean(params.companyId || params.siteId);

    // For location-based lookups, we return empty brands
    // but set canOverride based on level
    setBrands([]);
    setIsInherited(false);
    setConceptName(conceptNameValue);
    setCanOverride(userCanOverride);
  };

  return {
    brands,
    loading,
    error,
    isInherited,
    conceptName,
    canOverride
  };
}
