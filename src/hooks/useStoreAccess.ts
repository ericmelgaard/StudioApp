import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Store {
  id: number;
  name: string;
  company_id: number;
  company?: {
    id: number;
    name: string;
    concept_id: number;
  };
}

interface UseStoreAccessProps {
  userId?: string | null;
}

export function useStoreAccess(props?: UseStoreAccessProps) {
  const userId = props?.userId;
  const [accessibleStores, setAccessibleStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccessibleStores();
  }, [userId]);

  const loadAccessibleStores = async () => {
    setLoading(true);
    try {
      if (!userId) {
        // No user ID provided - show default demo stores
        const { data: stores, error } = await supabase
          .from('stores')
          .select(`
            id,
            name,
            company_id,
            companies (
              id,
              name,
              concept_id
            )
          `)
          .in('id', [1003023, 1003024]) // Dairy Queen Demo and Eurest Demo
          .order('name');

        if (error) throw error;

        setAccessibleStores(
          stores?.map(store => ({
            ...store,
            company: Array.isArray(store.companies) ? store.companies[0] : store.companies
          })) || []
        );
      } else {
        // Fetch user profile once with all needed fields
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, company_id, concept_id, store_id')
          .eq('id', userId)
          .maybeSingle();

        if (!profile) {
          setAccessibleStores([]);
          return;
        }

        // Priority 1: Admin role - return all stores for quick navigation
        if (profile.role === 'admin') {
          const { data: stores, error } = await supabase
            .from('stores')
            .select(`
              id,
              name,
              company_id,
              companies (
                id,
                name,
                concept_id
              )
            `)
            .not('company_id', 'is', null)
            .order('name');

          if (error) throw error;

          setAccessibleStores(
            stores?.map(store => ({
              ...store,
              company: Array.isArray(store.companies) ? store.companies[0] : store.companies
            })).filter(store => store.company_id) || []
          );
          return;
        }

        // Priority 2: Check user_store_access table (multi-store operators)
        const { data: accessData } = await supabase
          .from('user_store_access')
          .select('store_id')
          .eq('user_id', userId);

        if (accessData && accessData.length > 0) {
          const storeIds = accessData.map(a => a.store_id);
          const { data: stores, error } = await supabase
            .from('stores')
            .select(`
              id,
              name,
              company_id,
              companies (
                id,
                name,
                concept_id
              )
            `)
            .in('id', storeIds)
            .order('name');

          if (error) throw error;

          setAccessibleStores(
            stores?.map(store => ({
              ...store,
              company: Array.isArray(store.companies) ? store.companies[0] : store.companies
            })) || []
          );
          return;
        }

        // Priority 3: Single store from user_profiles
        if (profile.store_id) {
          const { data: stores, error } = await supabase
            .from('stores')
            .select(`
              id,
              name,
              company_id,
              companies (
                id,
                name,
                concept_id
              )
            `)
            .eq('id', profile.store_id);

          if (error) throw error;

          setAccessibleStores(
            stores?.map(store => ({
              ...store,
              company: Array.isArray(store.companies) ? store.companies[0] : store.companies
            })) || []
          );
          return;
        }

        // Priority 4: Company-level access
        if (profile.company_id) {
          const { data: stores, error } = await supabase
            .from('stores')
            .select(`
              id,
              name,
              company_id,
              companies (
                id,
                name,
                concept_id
              )
            `)
            .eq('company_id', profile.company_id)
            .order('name');

          if (error) throw error;

          setAccessibleStores(
            stores?.map(store => ({
              ...store,
              company: Array.isArray(store.companies) ? store.companies[0] : store.companies
            })) || []
          );
          return;
        }

        // Priority 5: Concept-level access
        if (profile.concept_id) {
          const { data: companies } = await supabase
            .from('companies')
            .select('id')
            .eq('concept_id', profile.concept_id);

          if (companies && companies.length > 0) {
            const companyIds = companies.map(c => c.id);
            const { data: stores, error } = await supabase
              .from('stores')
              .select(`
                id,
                name,
                company_id,
                companies (
                  id,
                  name,
                  concept_id
                )
              `)
              .in('company_id', companyIds)
              .order('name');

            if (error) throw error;

            setAccessibleStores(
              stores?.map(store => ({
                ...store,
                company: Array.isArray(store.companies) ? store.companies[0] : store.companies
              })) || []
            );
            return;
          }
        }

        // No access defined
        setAccessibleStores([]);
      }
    } catch (error) {
      console.error('Error loading accessible stores:', error);
      setAccessibleStores([]);
    } finally {
      setLoading(false);
    }
  };

  const hasAccessToStore = (storeId: number): boolean => {
    return accessibleStores.some(store => store.id === storeId);
  };

  const getDefaultStore = (): Store | null => {
    return accessibleStores[0] || null;
  };

  return {
    accessibleStores,
    loading,
    hasAccessToStore,
    getDefaultStore,
    refresh: loadAccessibleStores
  };
}
