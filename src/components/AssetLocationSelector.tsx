import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Concept {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
  concept_id: number;
}

interface Store {
  id: number;
  name: string;
  company_id: number;
}

interface AssetLocationSelectorProps {
  selectedCompanyId: number | null;
  selectedConceptId: number | null;
  selectedStoreId: number | null;
  onSelectionChange: (companyId: number | null, conceptId: number | null, storeId: number | null) => void;
}

export default function AssetLocationSelector({
  selectedCompanyId,
  selectedConceptId,
  selectedStoreId,
  onSelectionChange
}: AssetLocationSelectorProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedConceptId) {
      loadCompanies(selectedConceptId);
    } else {
      setCompanies([]);
    }
  }, [selectedConceptId]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadStores(selectedCompanyId);
    } else {
      setStores([]);
    }
  }, [selectedCompanyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: conceptsData } = await supabase
        .from('concepts')
        .select('*')
        .order('name');

      if (conceptsData) {
        setConcepts(conceptsData);
      }
    } catch (error) {
      console.error('Failed to load concepts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async (conceptId: number) => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('concept_id', conceptId)
        .order('name');

      if (data) {
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadStores = async (companyId: number) => {
    try {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (data) {
        setStores(data);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const handleConceptChange = (conceptId: number | null) => {
    onSelectionChange(null, conceptId, null);
  };

  const handleCompanyChange = (companyId: number | null) => {
    onSelectionChange(companyId, selectedConceptId, null);
  };

  const handleStoreChange = (storeId: number | null) => {
    onSelectionChange(selectedCompanyId, selectedConceptId, storeId);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading locations...</div>;
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Concept (Optional)
        </label>
        <select
          value={selectedConceptId || ''}
          onChange={(e) => handleConceptChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Concepts</option>
          {concepts.map((concept) => (
            <option key={concept.id} value={concept.id}>
              {concept.name}
            </option>
          ))}
        </select>
      </div>

      {selectedConceptId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company (Optional)
          </label>
          <select
            value={selectedCompanyId || ''}
            onChange={(e) => handleCompanyChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCompanyId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store (Optional)
          </label>
          <select
            value={selectedStoreId || ''}
            onChange={(e) => handleStoreChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
