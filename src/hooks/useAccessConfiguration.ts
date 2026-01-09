import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Concept {
  id: number;
  name: string;
  logo_url?: string;
  primary_color?: string;
}

export interface Company {
  id: number;
  name: string;
  concept_id: number;
  address?: string;
  city?: string;
  state?: string;
}

export interface Store {
  id: number;
  name: string;
  company_id: number;
  address?: string;
  city?: string;
  state?: string;
  operation_status?: string;
}

export interface AccessSelection {
  concepts: Set<number>;
  companies: Set<number>;
  stores: Set<number>;
}

export interface HierarchyData {
  concepts: Concept[];
  companies: Company[];
  stores: Store[];
}

export function useAccessConfiguration(userId?: string) {
  const [hierarchy, setHierarchy] = useState<HierarchyData>({
    concepts: [],
    companies: [],
    stores: []
  });
  const [selection, setSelection] = useState<AccessSelection>({
    concepts: new Set(),
    companies: new Set(),
    stores: new Set()
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHierarchy();
    if (userId) {
      loadUserAccess(userId);
    }
  }, [userId]);

  const loadHierarchy = async () => {
    try {
      const [conceptsRes, companiesRes, storesRes] = await Promise.all([
        supabase.from('concepts').select('*').order('name'),
        supabase.from('companies').select('*').order('name'),
        supabase.from('stores').select('*').order('name')
      ]);

      if (conceptsRes.data && companiesRes.data && storesRes.data) {
        setHierarchy({
          concepts: conceptsRes.data,
          companies: companiesRes.data,
          stores: storesRes.data
        });
      }
    } catch (error) {
      console.error('Error loading hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAccess = async (uid: string) => {
    try {
      const [conceptAccess, companyAccess, storeAccess] = await Promise.all([
        supabase.from('user_concept_access').select('concept_id').eq('user_id', uid),
        supabase.from('user_company_access').select('company_id').eq('user_id', uid),
        supabase.from('user_store_access').select('store_id').eq('user_id', uid)
      ]);

      setSelection({
        concepts: new Set(conceptAccess.data?.map(a => a.concept_id) || []),
        companies: new Set(companyAccess.data?.map(a => a.company_id) || []),
        stores: new Set(storeAccess.data?.map(a => a.store_id) || [])
      });
    } catch (error) {
      console.error('Error loading user access:', error);
    }
  };

  const toggleConcept = (conceptId: number) => {
    setSelection(prev => {
      const newConcepts = new Set(prev.concepts);
      if (newConcepts.has(conceptId)) {
        newConcepts.delete(conceptId);
      } else {
        newConcepts.add(conceptId);
      }
      return { ...prev, concepts: newConcepts };
    });
  };

  const toggleCompany = (companyId: number) => {
    setSelection(prev => {
      const newCompanies = new Set(prev.companies);
      if (newCompanies.has(companyId)) {
        newCompanies.delete(companyId);
      } else {
        newCompanies.add(companyId);
      }
      return { ...prev, companies: newCompanies };
    });
  };

  const toggleStore = (storeId: number) => {
    setSelection(prev => {
      const newStores = new Set(prev.stores);
      if (newStores.has(storeId)) {
        newStores.delete(storeId);
      } else {
        newStores.add(storeId);
      }
      return { ...prev, stores: newStores };
    });
  };

  const selectAllStoresForCompany = (companyId: number) => {
    const companyStores = hierarchy.stores.filter(s => s.company_id === companyId);
    setSelection(prev => {
      const newStores = new Set(prev.stores);
      companyStores.forEach(store => newStores.add(store.id));
      return { ...prev, stores: newStores };
    });
  };

  const selectAllStoresForConcept = (conceptId: number) => {
    const conceptCompanies = hierarchy.companies.filter(c => c.concept_id === conceptId);
    const conceptStores = hierarchy.stores.filter(s =>
      conceptCompanies.some(c => c.id === s.company_id)
    );
    setSelection(prev => {
      const newStores = new Set(prev.stores);
      conceptStores.forEach(store => newStores.add(store.id));
      return { ...prev, stores: newStores };
    });
  };

  const clearAll = () => {
    setSelection({
      concepts: new Set(),
      companies: new Set(),
      stores: new Set()
    });
  };

  const getEffectiveStoreCount = () => {
    const storeIds = new Set<number>();

    selection.concepts.forEach(conceptId => {
      const companies = hierarchy.companies.filter(c => c.concept_id === conceptId);
      companies.forEach(company => {
        const stores = hierarchy.stores.filter(s => s.company_id === company.id);
        stores.forEach(store => storeIds.add(store.id));
      });
    });

    selection.companies.forEach(companyId => {
      const stores = hierarchy.stores.filter(s => s.company_id === companyId);
      stores.forEach(store => storeIds.add(store.id));
    });

    selection.stores.forEach(storeId => {
      storeIds.add(storeId);
    });

    return storeIds.size;
  };

  const saveAccess = async (uid: string) => {
    try {
      await supabase.from('user_concept_access').delete().eq('user_id', uid);
      await supabase.from('user_company_access').delete().eq('user_id', uid);
      await supabase.from('user_store_access').delete().eq('user_id', uid);

      const conceptInserts = Array.from(selection.concepts).map(concept_id => ({
        user_id: uid,
        concept_id
      }));

      const companyInserts = Array.from(selection.companies).map(company_id => ({
        user_id: uid,
        company_id
      }));

      const storeInserts = Array.from(selection.stores).map(store_id => ({
        user_id: uid,
        store_id
      }));

      if (conceptInserts.length > 0) {
        await supabase.from('user_concept_access').insert(conceptInserts);
      }
      if (companyInserts.length > 0) {
        await supabase.from('user_company_access').insert(companyInserts);
      }
      if (storeInserts.length > 0) {
        await supabase.from('user_store_access').insert(storeInserts);
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving access:', error);
      return { success: false, error };
    }
  };

  return {
    hierarchy,
    selection,
    loading,
    searchTerm,
    setSearchTerm,
    toggleConcept,
    toggleCompany,
    toggleStore,
    selectAllStoresForCompany,
    selectAllStoresForConcept,
    clearAll,
    getEffectiveStoreCount,
    saveAccess
  };
}
