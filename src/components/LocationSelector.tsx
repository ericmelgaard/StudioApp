import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, X, Building2, Layers, MapPin, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStoreAccess } from '../hooks/useStoreAccess';

// Standardized icon mapping for location hierarchy
const getLocationIcon = (level: 'wand' | 'concept' | 'company' | 'store', className = "w-5 h-5") => {
  const colorClass = level === 'wand' ? 'text-purple-600' :
                     level === 'concept' ? 'text-blue-600' :
                     level === 'company' ? 'text-green-600' :
                     'text-red-600';

  switch (level) {
    case 'wand':
      return <Sparkles className={`${className} ${colorClass}`} />;
    case 'concept':
      return <Building2 className={`${className} ${colorClass}`} />;
    case 'company':
      return <Layers className={`${className} ${colorClass}`} />;
    case 'store':
      return <MapPin className={`${className} ${colorClass}`} />;
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
  filterByConceptId?: number;
  userId?: string;
}

export default function LocationSelector({ onClose, onSelect, selectedLocation, filterByConceptId, userId }: LocationSelectorProps) {
  const { accessibleStores, loading: storesLoading } = useStoreAccess({ userId });
  const [searchQuery, setSearchQuery] = useState('');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isMultiStoreUser, setIsMultiStoreUser] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [expandedConcept, setExpandedConcept] = useState<number | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState<Set<number>>(new Set());
  const [loadingStores, setLoadingStores] = useState<Set<number>>(new Set());

  useEffect(() => {
    const initializeData = async () => {
      await loadData();

      // Auto-expand to the current location in the tree
      if (selectedLocation?.concept) {
        setExpandedConcept(selectedLocation.concept.id);
      }
      if (selectedLocation?.company) {
        setExpandedCompanies(new Set([selectedLocation.company.id]));
        // Auto-load stores for the current company after data is loaded
        await loadStoresForCompany(selectedLocation.company.id);
      }
    };

    initializeData();
  }, [accessibleStores, storesLoading]);

  const loadData = async () => {
    if (storesLoading) return;

    setLoading(true);

    // Check if user has multi-store access via user_store_access table
    let isAdmin = false;
    if (userId) {
      const { data: userAccess } = await supabase
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', userId);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      isAdmin = profile?.role === 'admin';
      setUserRole(profile?.role || null);
      setIsMultiStoreUser((userAccess && userAccess.length > 0) || false);
    }

    // For admin users, load all concepts AND companies upfront
    if (isAdmin) {
      let conceptsQuery = supabase
        .from('concepts')
        .select('*')
        .order('name');

      let companiesQuery = supabase
        .from('companies')
        .select('*')
        .order('name');

      if (filterByConceptId) {
        conceptsQuery = conceptsQuery.eq('id', filterByConceptId);
        companiesQuery = companiesQuery.eq('concept_id', filterByConceptId);
      }

      const [conceptsData, companiesData] = await Promise.all([conceptsQuery, companiesQuery]);

      if (conceptsData.data) setConcepts(conceptsData.data);
      if (companiesData.data) setCompanies(companiesData.data);
      setStores([]);
      setLoading(false);
      return;
    }

    // For non-admin users, derive locations from accessibleStores
    const accessibleStoreIds = accessibleStores.map(s => s.id);
    const accessibleCompanyIds = [...new Set(accessibleStores.map(s => s.company_id).filter(id => id !== null))];
    const accessibleConceptIds = [...new Set(accessibleStores.map(s => s.company?.concept_id).filter(Boolean))];

    let conceptsQuery = supabase
      .from('concepts')
      .select('*')
      .in('id', accessibleConceptIds)
      .order('name');

    if (filterByConceptId) {
      conceptsQuery = conceptsQuery.eq('id', filterByConceptId);
    }

    let companiesQuery = supabase
      .from('companies')
      .select('*')
      .in('id', accessibleCompanyIds)
      .order('name');

    if (filterByConceptId) {
      companiesQuery = companiesQuery.eq('concept_id', filterByConceptId);
    }

    const [conceptsData, companiesData] = await Promise.all([conceptsQuery, companiesQuery]);

    const formattedStores: Store[] = accessibleStores.map(s => ({
      id: s.id,
      name: s.name,
      company_id: s.company_id
    }));

    if (conceptsData.data) setConcepts(conceptsData.data);
    if (companiesData.data) setCompanies(companiesData.data);
    setStores(formattedStores);
    setLoading(false);
  };

  const loadCompaniesForConcept = async (conceptId: number) => {
    if (loadingCompanies.has(conceptId)) return;

    setLoadingCompanies(prev => new Set(prev).add(conceptId));

    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .eq('concept_id', conceptId)
      .order('name');

    if (companiesData) {
      setCompanies(prev => {
        const existing = prev.filter(c => c.concept_id !== conceptId);
        return [...existing, ...companiesData];
      });
    }

    setLoadingCompanies(prev => {
      const newSet = new Set(prev);
      newSet.delete(conceptId);
      return newSet;
    });
  };

  const loadStoresForCompany = async (companyId: number) => {
    if (loadingStores.has(companyId)) return;

    setLoadingStores(prev => new Set(prev).add(companyId));

    const { data: storesData } = await supabase
      .from('stores')
      .select('id, name, company_id')
      .eq('company_id', companyId)
      .order('name');

    if (storesData) {
      setStores(prev => {
        const existing = prev.filter(s => s.company_id !== companyId);
        return [...existing, ...storesData];
      });
    }

    setLoadingStores(prev => {
      const newSet = new Set(prev);
      newSet.delete(companyId);
      return newSet;
    });
  };

  const handleExpandConcept = async (conceptId: number) => {
    const isExpanded = expandedConcept === conceptId;
    setExpandedConcept(isExpanded ? null : conceptId);

    if (!isExpanded && userRole === 'admin') {
      // Get all companies for this concept
      const conceptCompanies = companies.filter(c => c.concept_id === conceptId);
      const companyIds = conceptCompanies.map(c => c.id);

      // Auto-expand all companies
      setExpandedCompanies(new Set(companyIds));

      // Load stores for all companies in parallel
      if (companyIds.length > 0) {
        const storePromises = companyIds.map(companyId =>
          supabase
            .from('stores')
            .select('id, name, company_id')
            .eq('company_id', companyId)
            .order('name')
        );

        const results = await Promise.all(storePromises);
        const allStores = results.flatMap(result => result.data || []);

        setStores(prev => {
          // Remove existing stores for these companies, then add new ones
          const existing = prev.filter(s => !companyIds.includes(s.company_id));
          return [...existing, ...allStores];
        });
      }
    } else if (isExpanded) {
      // Clear expanded companies when collapsing concept
      setExpandedCompanies(new Set());
    }
  };

  const handleExpandCompany = async (companyId: number) => {
    const isExpanded = expandedCompanies.has(companyId);

    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });

    // Load stores if expanding and user is admin
    if (!isExpanded && userRole === 'admin') {
      await loadStoresForCompany(companyId);
    }
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
    const filtered = stores.filter(s => {
      if (s.company_id !== companyId) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchLower)) {
        return false;
      }
      return true;
    });
    return filtered;
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

  // For multi-store users (operators), show simplified flat view
  if (isMultiStoreUser && userRole !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
        <div className="relative z-[201] bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Select Store</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search your stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {accessibleStores
                .filter(store => !searchQuery || store.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(store => {
                  const concept = concepts.find(c => c.id === store.company?.concept_id);
                  const company = companies.find(c => c.id === store.company_id);

                  return (
                    <button
                      key={store.id}
                      onClick={() => {
                        if (concept && company) {
                          handleSelectStore(store, company, concept);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      {getLocationIcon('store', 'w-5 h-5')}
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{store.name}</div>
                        {company && (
                          <div className="text-xs text-slate-500">{company.name}</div>
                        )}
                      </div>
                      {selectedLocation?.store?.id === store.id && (
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
      <div className="relative z-[201] bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Select Location</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 space-y-3">
          {/* Show current location breadcrumb */}
          {selectedLocation && (selectedLocation.concept || selectedLocation.company || selectedLocation.store) && (
            <div className="flex items-center gap-2 text-sm">
              {userRole === 'admin' && (
                <>
                  <button
                    onClick={() => onSelect({})}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    WAND Digital
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </>
              )}
              {selectedLocation.concept && (
                <>
                  <span className="text-slate-700">{selectedLocation.concept.name}</span>
                  {selectedLocation.company && <ChevronRight className="w-4 h-4 text-slate-400" />}
                </>
              )}
              {selectedLocation.company && (
                <>
                  <span className="text-slate-700">{selectedLocation.company.name}</span>
                  {selectedLocation.store && <ChevronRight className="w-4 h-4 text-slate-400" />}
                </>
              )}
              {selectedLocation.store && (
                <span className="text-slate-700 font-medium">{selectedLocation.store.name}</span>
              )}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search concepts, companies, or stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
          {/* Always show full tree hierarchy */}
          {filteredConcepts.length === 0 ? (
            <div className="text-center py-4 text-slate-500">No locations found</div>
          ) : (
            <div className="space-y-2">
              {filteredConcepts.map((concept) => {
                const conceptCompanies = getCompaniesForConcept(concept.id);
                const isExpanded = expandedConcept === concept.id;

                return (
                  <div key={concept.id} className="border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 p-3 hover:bg-slate-50">
                      <button
                        onClick={() => handleExpandConcept(concept.id)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {(conceptCompanies.length > 0 || userRole === 'admin') && (
                          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      {getLocationIcon('concept', "w-5 h-5")}
                      <button
                        onClick={() => handleSelectConcept(concept)}
                        className="flex-1 text-left font-medium text-slate-900 hover:text-blue-600"
                      >
                        {concept.name}
                      </button>
                      {conceptCompanies.length > 0 && (
                        <span className="text-sm text-slate-500">{conceptCompanies.length} companies</span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="pl-8 pr-3 pb-2 space-y-1">
                        {conceptCompanies.length === 0 ? (
                          <div className="p-2 text-sm text-slate-500">No companies found</div>
                        ) : (
                          conceptCompanies.map((company) => {
                          const companyStores = getStoresForCompany(company.id);
                          const isCompanyExpanded = expandedCompanies.has(company.id);

                          return (
                            <div key={company.id} className="border-l-2 border-slate-200 pl-2">
                              <div className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                                <button
                                  onClick={() => handleExpandCompany(company.id)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                >
                                  {(companyStores.length > 0 || userRole === 'admin') && (
                                    isCompanyExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                {getLocationIcon('company', "w-4 h-4")}
                                <button
                                  onClick={() => handleSelectCompany(company, concept)}
                                  className="flex-1 text-left text-slate-700 hover:text-blue-600"
                                >
                                  {company.name}
                                </button>
                                {companyStores.length > 0 && (
                                  <span className="text-xs text-slate-500">{companyStores.length} stores</span>
                                )}
                              </div>

                              {isCompanyExpanded && (
                                <div className="pl-6 space-y-1">
                                  {loadingStores.has(company.id) && (
                                    <div className="p-2 text-xs text-slate-500 flex items-center gap-2">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                      Loading stores...
                                    </div>
                                  )}
                                  {companyStores.map((store) => (
                                    <button
                                      key={store.id}
                                      onClick={() => handleSelectStore(store, company, concept)}
                                      className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded w-full text-left"
                                    >
                                      {getLocationIcon('store', "w-4 h-4")}
                                      <span className="text-slate-600 hover:text-blue-600 text-sm">{store.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                        )}
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
