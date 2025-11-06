import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, X, Building2, Layers, MapPin } from 'lucide-react';
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

  const [viewContext, setViewContext] = useState<{
    concept?: Concept;
    company?: Company;
    store?: Store;
  }>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    setViewContext(selectedLocation || {});
    if (selectedLocation?.concept) {
      setExpandedConcept(selectedLocation.concept.id);
    }
    if (selectedLocation?.company) {
      setExpandedCompany(selectedLocation.company.id);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [conceptsData, companiesData, storesData] = await Promise.all([
      supabase.from('concepts').select('*').order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('stores').select('*').order('name').limit(5000),
    ]);

    if (conceptsData.data) setConcepts(conceptsData.data);
    if (companiesData.data) setCompanies(companiesData.data);
    if (storesData.data) setStores(storesData.data);
    setLoading(false);
  };

  const filteredConcepts = concepts.filter(c => {
    if (viewContext?.concept && c.id !== viewContext.concept.id) {
      return false;
    }
    return c.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getCompaniesForConcept = (conceptId: number) => {
    return companies.filter(c => {
      if (c.concept_id !== conceptId) return false;
      if (viewContext?.company && c.id !== viewContext.company.id) {
        return false;
      }
      return true;
    });
  };

  const getStoresForCompany = (companyId: number) => {
    return stores.filter(s => s.company_id === companyId);
  };

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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="relative z-[61] bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-slate-700">Loading locations...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="relative z-[61] bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
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
          <div className="flex items-center justify-between">
            <button
              onClick={() => onSelect({})}
              className="text-xs text-slate-500 hover:text-blue-600 hover:underline transition-colors"
            >
              ← Return to WAND Digital
            </button>
          </div>

          {(viewContext?.concept || viewContext?.company || viewContext?.store) && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setViewContext({})}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                WAND Digital
              </button>
              {viewContext?.concept && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  {viewContext.company || viewContext.store ? (
                    <button
                      onClick={() => setViewContext({ concept: viewContext.concept })}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {viewContext.concept.name}
                    </button>
                  ) : (
                    <span className="text-slate-700 font-medium">{viewContext.concept.name}</span>
                  )}
                </>
              )}
              {viewContext?.company && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  {viewContext.store ? (
                    <button
                      onClick={() => setViewContext({ concept: viewContext.concept, company: viewContext.company })}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {viewContext.company.name}
                    </button>
                  ) : (
                    <span className="text-slate-700 font-medium">{viewContext.company.name}</span>
                  )}
                </>
              )}
              {viewContext?.store && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700 font-medium">{viewContext.store.name}</span>
                </>
              )}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
          {filteredConcepts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No locations found</div>
          ) : (
            <div className="space-y-2">
              {filteredConcepts.map((concept) => {
                const conceptCompanies = getCompaniesForConcept(concept.id);
                const isExpanded = expandedConcept === concept.id;

                return (
                  <div key={concept.id} className="border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 p-3 hover:bg-slate-50">
                      <button
                        onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {conceptCompanies.length > 0 && (
                          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <button
                        onClick={() => handleSelectConcept(concept)}
                        className="flex-1 text-left font-medium text-slate-900 hover:text-blue-600"
                      >
                        {concept.name}
                      </button>
                      <span className="text-sm text-slate-500">{conceptCompanies.length} companies</span>
                    </div>

                    {isExpanded && conceptCompanies.length > 0 && (
                      <div className="pl-8 pr-3 pb-2 space-y-1">
                        {conceptCompanies.map((company) => {
                          const companyStores = getStoresForCompany(company.id);
                          const isCompanyExpanded = expandedCompany === company.id;

                          return (
                            <div key={company.id} className="border-l-2 border-slate-200 pl-2">
                              <div className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                                <button
                                  onClick={() => setExpandedCompany(isCompanyExpanded ? null : company.id)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                >
                                  {companyStores.length > 0 && (
                                    isCompanyExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <Layers className="w-4 h-4 text-green-600" />
                                <button
                                  onClick={() => handleSelectCompany(company, concept)}
                                  className="flex-1 text-left text-slate-700 hover:text-blue-600"
                                >
                                  {company.name}
                                </button>
                                <span className="text-xs text-slate-500">{companyStores.length} stores</span>
                              </div>

                              {isCompanyExpanded && companyStores.length > 0 && (
                                <div className="pl-6 space-y-1">
                                  {companyStores.map((store) => (
                                    <button
                                      key={store.id}
                                      onClick={() => handleSelectStore(store, company, concept)}
                                      className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded w-full text-left"
                                    >
                                      <MapPin className="w-4 h-4 text-red-600" />
                                      <span className="text-slate-600 hover:text-blue-600 text-sm">{store.name}</span>
                                    </button>
                                  ))}
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
