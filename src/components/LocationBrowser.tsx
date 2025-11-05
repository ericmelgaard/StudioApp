import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Building2, Layers, MapPin, X } from 'lucide-react';
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

interface LocationBrowserProps {
  selectedConcept: Concept | null;
  selectedCompany: Company | null;
  selectedStore: Store | null;
  onSelectConcept: (concept: Concept | null) => void;
  onSelectCompany: (company: Company | null) => void;
  onSelectStore: (store: Store | null) => void;
}

export default function LocationBrowser({
  selectedConcept,
  selectedCompany,
  selectedStore,
  onSelectConcept,
  onSelectCompany,
  onSelectStore,
}: LocationBrowserProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [expandedConcept, setExpandedConcept] = useState<number | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [conceptsData, companiesData, storesData] = await Promise.all([
      supabase.from('concepts').select('*').order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('stores').select('*').order('name'),
    ]);

    if (conceptsData.data) setConcepts(conceptsData.data);
    if (companiesData.data) setCompanies(companiesData.data);
    if (storesData.data) setStores(storesData.data);
    setLoading(false);
  };

  const getCompaniesForConcept = (conceptId: number) => {
    return companies.filter(c => c.concept_id === conceptId);
  };

  const getStoresForCompany = (companyId: number) => {
    return stores.filter(s => s.company_id === companyId);
  };

  const handleSelectConcept = (concept: Concept) => {
    if (selectedConcept?.id === concept.id) {
      onSelectConcept(null);
      onSelectCompany(null);
      onSelectStore(null);
    } else {
      onSelectConcept(concept);
      onSelectCompany(null);
      onSelectStore(null);
      setExpandedConcept(concept.id);
    }
  };

  const handleSelectCompany = (company: Company, concept: Concept) => {
    if (selectedCompany?.id === company.id) {
      onSelectCompany(null);
      onSelectStore(null);
    } else {
      onSelectConcept(concept);
      onSelectCompany(company);
      onSelectStore(null);
      setExpandedCompany(company.id);
    }
  };

  const handleSelectStore = (store: Store, company: Company, concept: Concept) => {
    onSelectConcept(concept);
    onSelectCompany(company);
    onSelectStore(store);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Loading locations...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 max-h-[45vh] overflow-y-auto border-b border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Location Browser</h3>
          {(selectedConcept || selectedCompany || selectedStore) && (
            <button
              onClick={() => {
                onSelectConcept(null);
                onSelectCompany(null);
                onSelectStore(null);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
        {(selectedConcept || selectedCompany || selectedStore) && (
          <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 space-y-1">
            {selectedConcept && (
              <div className="flex items-center gap-1 text-blue-900">
                <Building2 className="w-3 h-3" />
                <span className="font-medium">{selectedConcept.name}</span>
              </div>
            )}
            {selectedCompany && (
              <div className="flex items-center gap-1 text-blue-800 pl-4">
                <Layers className="w-3 h-3" />
                <span>{selectedCompany.name}</span>
              </div>
            )}
            {selectedStore && (
              <div className="flex items-center gap-1 text-blue-700 pl-8">
                <MapPin className="w-3 h-3" />
                <span>{selectedStore.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-2">
        {concepts.length === 0 ? (
          <div className="text-center py-4 text-sm text-slate-500">No locations found</div>
        ) : (
          <div className="space-y-1">
            {concepts.map((concept) => {
              const conceptCompanies = getCompaniesForConcept(concept.id);
              const isExpanded = expandedConcept === concept.id;
              const isSelected = selectedConcept?.id === concept.id;

              return (
                <div key={concept.id}>
                  <div
                    className={`flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                      className="p-0.5 hover:bg-slate-200 rounded"
                    >
                      {conceptCompanies.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-slate-600" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                        )
                      ) : (
                        <div className="w-3 h-3" />
                      )}
                    </button>
                    <Building2 className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-600'}`} />
                    <button
                      onClick={() => handleSelectConcept(concept)}
                      className={`flex-1 text-left text-sm truncate ${
                        isSelected ? 'text-blue-900 font-medium' : 'text-slate-900'
                      }`}
                    >
                      {concept.name}
                    </button>
                    <span className="text-xs text-slate-400">{conceptCompanies.length}</span>
                  </div>

                  {isExpanded && conceptCompanies.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {conceptCompanies.map((company) => {
                        const companyStores = getStoresForCompany(company.id);
                        const isCompanyExpanded = expandedCompany === company.id;
                        const isCompanySelected = selectedCompany?.id === company.id;

                        return (
                          <div key={company.id}>
                            <div
                              className={`flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors ${
                                isCompanySelected ? 'bg-green-50' : ''
                              }`}
                            >
                              <button
                                onClick={() => setExpandedCompany(isCompanyExpanded ? null : company.id)}
                                className="p-0.5 hover:bg-slate-200 rounded"
                              >
                                {companyStores.length > 0 ? (
                                  isCompanyExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-slate-600" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                  )
                                ) : (
                                  <div className="w-3 h-3" />
                                )}
                              </button>
                              <Layers className={`w-4 h-4 flex-shrink-0 ${isCompanySelected ? 'text-green-600' : 'text-slate-500'}`} />
                              <button
                                onClick={() => handleSelectCompany(company, concept)}
                                className={`flex-1 text-left text-sm truncate ${
                                  isCompanySelected ? 'text-green-900 font-medium' : 'text-slate-800'
                                }`}
                              >
                                {company.name}
                              </button>
                              <span className="text-xs text-slate-400">{companyStores.length}</span>
                            </div>

                            {isCompanyExpanded && companyStores.length > 0 && (
                              <div className="ml-4 mt-1 space-y-1">
                                {companyStores.map((store) => {
                                  const isStoreSelected = selectedStore?.id === store.id;

                                  return (
                                    <button
                                      key={store.id}
                                      onClick={() => handleSelectStore(store, company, concept)}
                                      className={`w-full flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors ${
                                        isStoreSelected ? 'bg-red-50' : ''
                                      }`}
                                    >
                                      <div className="w-3 h-3" />
                                      <MapPin className={`w-3 h-3 flex-shrink-0 ${isStoreSelected ? 'text-red-600' : 'text-slate-400'}`} />
                                      <span className={`flex-1 text-left text-sm truncate ${
                                        isStoreSelected ? 'text-red-900 font-medium' : 'text-slate-700'
                                      }`}>
                                        {store.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
