import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BrandOptionsResult {
  brands: string[];
  loading: boolean;
  error: string | null;
  isInherited: boolean;
  isLocked: boolean;
  conceptName: string | null;
  canOverride: boolean;
}

/**
 * Hook to resolve brand options for a given integration config or location context
 * Returns either local brand options or inherited brands from parent concept
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
  const [isLocked, setIsLocked] = useState(false);
  const [conceptName, setConceptName] = useState<string | null>(null);
  const [canOverride, setCanOverride] = useState(false);

  useEffect(() => {
    loadBrandOptions();
  }, [params.configId, params.conceptId, params.companyId, params.siteId]);

  const loadBrandOptions = async () => {
    setLoading(true);
    setError(null);

    try {
      // If configId is provided, load from config
      if (params.configId) {
        await loadFromConfig(params.configId);
      }
      // If location context is provided, load from concept
      else if (params.conceptId || params.companyId || params.siteId) {
        await loadFromLocation();
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading brand options:', err);
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

    // If config has local brand_options, use those
    if (config.brand_options && Array.isArray(config.brand_options) && config.brand_options.length > 0) {
      setBrands(config.brand_options);
      setIsInherited(false);
      setIsLocked(config.brand_locked || false);
      setCanOverride(false);
      return;
    }

    // Otherwise, get from parent concept
    let conceptId: number | null = null;

    if (config.application_level === 'concept' && config.concept_id) {
      conceptId = config.concept_id;
    } else if (config.application_level === 'company' && config.company_id) {
      // Get concept from company
      const { data: company } = await supabase
        .from('companies')
        .select('concept_id, concepts(name)')
        .eq('id', config.company_id)
        .single();

      if (company) {
        conceptId = company.concept_id;
        setConceptName((company.concepts as any)?.name || null);
      }
    } else if (config.application_level === 'site' && config.site_id) {
      // Get concept from site -> company -> concept
      const { data: store } = await supabase
        .from('stores')
        .select('company_id, companies(concept_id, concepts(name))')
        .eq('id', config.site_id)
        .single();

      if (store && store.companies) {
        conceptId = (store.companies as any).concept_id;
        setConceptName((store.companies as any)?.concepts?.name || null);
      }
    }

    if (conceptId) {
      const { data: concept } = await supabase
        .from('concepts')
        .select('brand_options, name')
        .eq('id', conceptId)
        .single();

      if (concept) {
        setBrands(concept.brand_options || []);
        setConceptName(concept.name);
      }
    }

    setIsInherited(true);
    setIsLocked(config.brand_locked || false);
    setCanOverride(config.application_level !== 'concept');
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
        .select('concept_id, concepts(name)')
        .eq('id', params.companyId)
        .single();

      if (company) {
        conceptId = company.concept_id;
        setConceptName((company.concepts as any)?.name || null);
      }
    }
    // Get concept from site
    else if (params.siteId) {
      const { data: store } = await supabase
        .from('stores')
        .select('company_id, companies(concept_id, concepts(name))')
        .eq('id', params.siteId)
        .single();

      if (store && store.companies) {
        conceptId = (store.companies as any).concept_id;
        setConceptName((store.companies as any)?.concepts?.name || null);
      }
    }

    if (conceptId) {
      const { data: concept } = await supabase
        .from('concepts')
        .select('brand_options, name')
        .eq('id', conceptId)
        .single();

      if (concept) {
        setBrands(concept.brand_options || []);
        setConceptName(concept.name);
      }
    }

    setIsInherited(true);
    setIsLocked(false);
    setCanOverride(!!params.companyId || !!params.siteId);
  };

  return {
    brands,
    loading,
    error,
    isInherited,
    isLocked,
    conceptName,
    canOverride
  };
}
