import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, X, Building2, Layers, MapPin, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

const getLocationIcon = (level: 'wand' | 'concept' | 'company' | 'store', className = "w-5 h-5") => {
  switch (level) {
    case 'wand':
      return <Sparkles className={className} />;
    case 'concept':
      return <Building2 className={className} />;
    case 'company':
      return <Layers className={className} />;
    case 'store':
      return <MapPin className={className} />;
  }
};

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

interface LocationSelectorProps {
  onClose: () => void;
  onSelect: (location: {
    concept?: Concept;
    company?: Company;
    store?: Store;
  }) => void;
  selectedLocation?: {
    concept?: Concept;
    company?: Company;
    store?: Store;
  };
}

export default function LocationSelector({ onClose, onSelect, selectedLocation }: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [expandedConcept, setExpandedConcept] = useState<number | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    if (selectedLocation?.concept) {
      setExpandedConcept(selectedLocation.concept.id);
    }
    if (selectedLocation?.company) {
      setExpandedCompany(selectedLocation.company.id);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);

    const conceptsPromise = supabase.from('concepts').select('*').order('name');
    const companiesPromise = supabase.from('companies').select('*').order('name');

    let allStores: Store[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error loading stores:', error);
        hasMore = false;
      } else if (data) {
        allStores = [...allStores, ...data];
        hasMore = data.length === pageSize;
        from += pageSize;
      } else {
        hasMore = false;
      }
    }

    const [conceptsData, companiesData] = await Promise.all([conceptsPromise, companiesPromise]);

    if (conceptsData.data) setConcepts(conceptsData.data);
    if (companiesData.data) setCompanies(companiesData.data);
    setStores(allStores);
    setLoading(false);
  };

  const searchLower = searchQuery.toLowerCase();

  const getCompaniesForConcept = (conceptId: number) => {
    return companies.filter(c => {
      if (c.concept_id !== conceptId) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchLower)) {
        const companyStores = stores.filter(s => s.company_id === c.id);
        const hasMatchingStore = companyStores.some(s => s.name.toLowerCase().includes(searchLower));
        if (!hasMatchingStore) return false;
      }
      return true;
    });
  };

  const getStoresForCompany = (companyId: number) => {
    return stores.filter(s => {
      if (s.company_id !== companyId) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchLower)) {
        return false;
      }
      return true;
    });
  };

  const filteredConcepts = concepts.filter(c => {
    if (searchQuery) {
      const conceptMatches = c.name.toLowerCase().includes(searchLower);
      if (conceptMatches) return true;

      const conceptCompanies = companies.filter(comp => comp.concept_id === c.id);
      const hasMatchingCompany = conceptCompanies.some(comp => {
        const companyMatches = comp.name.toLowerCase().includes(searchLower);
        if (companyMatches) return true;

        const companyStores = stores.filter(s => s.company_id === comp.id);
        return companyStores.some(s => s.name.toLowerCase().includes(searchLower));
      });

      if (!hasMatchingCompany) return false;
    }
    return true;
  });

  const handleSelectConcept = (concept: Concept) => {
    onSelect({ concept });
  };

  const handleSelectCompany = (company: Company, concept: Concept) => {
    onSelect({ concept, company });
  };

  const handleSelectStore = (store: Store, company: Company, concept: Concept) => {
    onSelect({ concept, company, store });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
        <div className="relative z-[201] bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-slate-700">Loading locations...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="relative z-[201] bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Select Location</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 md:p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              onClick={() => onSelect({})}
              className="text-sm text-slate-500 hover:text-blue-600 hover:underline transition-colors text-left"
            >
              Return to WAND Digital
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search concepts, companies, or stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 md:py-2 text-base md:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
          {filteredConcepts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No locations found</div>
          ) : (
            <div className="space-y-2">
              {filteredConcepts.map((concept) => {
                const conceptCompanies = getCompaniesForConcept(concept.id);
                const isExpanded = expandedConcept === concept.id;
                const isSelected = selectedLocation?.concept?.id === concept.id && !selectedLocation.company && !selectedLocation.store;

                return (
                  <div key={concept.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className={`flex items-center gap-2 p-3 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                      <button
                        onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                      >
                        {conceptCompanies.length > 0 && (
                          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      {getLocationIcon('concept', "w-5 h-5 text-blue-600 flex-shrink-0")}
                      <button
                        onClick={() => handleSelectConcept(concept)}
                        className={`flex-1 text-left font-medium hover:text-blue-600 transition-colors min-w-0 ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}
                      >
                        <span className="truncate block">{concept.name}</span>
                      </button>
                      <span className="text-sm text-slate-500 flex-shrink-0">{conceptCompanies.length} companies</span>
                    </div>

                    {isExpanded && conceptCompanies.length > 0 && (
                      <div className="bg-slate-50 pl-8 pr-3 pb-2 space-y-1">
                        {conceptCompanies.map((company) => {
                          const companyStores = getStoresForCompany(company.id);
                          const isCompanyExpanded = expandedCompany === company.id;
                          const isCompanySelected = selectedLocation?.company?.id === company.id && !selectedLocation.store;

                          return (
                            <div key={company.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                              <div className={`flex items-center gap-2 p-2.5 hover:bg-slate-50 transition-colors ${isCompanySelected ? 'bg-blue-50' : ''}`}>
                                <button
                                  onClick={() => setExpandedCompany(isCompanyExpanded ? null : company.id)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                                >
                                  {companyStores.length > 0 && (
                                    isCompanyExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                {getLocationIcon('company', "w-4 h-4 text-green-600 flex-shrink-0")}
                                <button
                                  onClick={() => handleSelectCompany(company, concept)}
                                  className={`flex-1 text-left text-sm hover:text-blue-600 transition-colors min-w-0 ${isCompanySelected ? 'text-blue-700 font-medium' : 'text-slate-700'}`}
                                >
                                  <span className="truncate block">{company.name}</span>
                                </button>
                                <span className="text-xs text-slate-500 flex-shrink-0">{companyStores.length} stores</span>
                              </div>

                              {isCompanyExpanded && companyStores.length > 0 && (
                                <div className="bg-slate-50 pl-8 pr-2 pb-1 space-y-1">
                                  {companyStores.map((store) => {
                                    const isStoreSelected = selectedLocation?.store?.id === store.id;
                                    return (
                                      <button
                                        key={store.id}
                                        onClick={() => handleSelectStore(store, company, concept)}
                                        className={`flex items-center gap-2 p-2 rounded w-full text-left transition-colors ${
                                          isStoreSelected ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-white text-slate-600'
                                        }`}
                                      >
                                        {getLocationIcon('store', "w-4 h-4 text-red-600 flex-shrink-0")}
                                        <span className="text-sm truncate">{store.name}</span>
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
    </div>
  );
}
