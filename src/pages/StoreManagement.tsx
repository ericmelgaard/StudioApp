import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown, Building2, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Concept {
  id: number;
  name: string;
  created_at: string;
}

interface Company {
  id: number;
  name: string;
  concept_id: number;
  created_at: string;
}

interface StoreRecord {
  id: number;
  name: string;
  company_id: number;
  created_at: string;
}

interface StoreManagementProps {
  onBack: () => void;
}

export default function StoreManagement({ onBack }: StoreManagementProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLocationData();
  }, []);


  const loadLocationData = async () => {
    setLoading(true);

    const [conceptsResult, companiesResult, storesResult] = await Promise.all([
      supabase.from('concepts').select('*').order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('stores').select('*').order('name')
    ]);

    if (conceptsResult.error) {
      console.error('Error loading concepts:', conceptsResult.error);
      alert(`Failed to load concepts: ${conceptsResult.error.message}`);
    }

    if (companiesResult.error) {
      console.error('Error loading companies:', companiesResult.error);
      alert(`Failed to load companies: ${companiesResult.error.message}`);
    }

    if (storesResult.error) {
      console.error('Error loading stores:', storesResult.error);
      alert(`Failed to load stores: ${storesResult.error.message}`);
    }

    setConcepts(conceptsResult.data || []);
    setCompanies(companiesResult.data || []);
    setStores(storesResult.data || []);
    setLoading(false);
  };


  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const buildTree = (): JSX.Element[] => {
    return concepts.map(concept => {
      const conceptCompanies = companies.filter(c => c.concept_id === concept.id);
      const hasCompanies = conceptCompanies.length > 0;
      const conceptKey = `concept-${concept.id}`;
      const isConceptExpanded = expandedNodes.has(conceptKey);

      return (
        <div key={conceptKey} className="mb-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <button
              onClick={() => toggleNode(conceptKey)}
              className="p-1 hover:bg-blue-200 rounded transition-colors"
              disabled={!hasCompanies}
            >
              {hasCompanies ? (
                isConceptExpanded ? (
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-blue-600" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>
            <Building2 className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <h4 className="font-bold text-blue-900">{concept.name}</h4>
              <p className="text-xs text-blue-600">{conceptCompanies.length} companies</p>
            </div>
          </div>

          {isConceptExpanded && conceptCompanies.map(company => {
            const companyStores = stores.filter(s => s.company_id === company.id);
            const hasStores = companyStores.length > 0;
            const companyKey = `company-${company.id}`;
            const isCompanyExpanded = expandedNodes.has(companyKey);

            return (
              <div key={companyKey} className="ml-8 mt-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <button
                    onClick={() => toggleNode(companyKey)}
                    className="p-1 hover:bg-green-200 rounded transition-colors"
                    disabled={!hasStores}
                  >
                    {hasStores ? (
                      isCompanyExpanded ? (
                        <ChevronDown className="w-4 h-4 text-green-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-green-600" />
                      )
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </button>
                  <Building2 className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <h5 className="font-semibold text-green-900">{company.name}</h5>
                    <p className="text-xs text-green-600">{companyStores.length} stores</p>
                  </div>
                </div>

                {isCompanyExpanded && companyStores.map(store => (
                  <div key={`store-${store.id}`} className="ml-8 mt-2">
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <div className="w-4 h-4" />
                      <Store className="w-4 h-4 text-amber-600" />
                      <div className="flex-1">
                        <h6 className="font-medium text-slate-900">{store.name}</h6>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Store Management</h1>
                <p className="text-xs text-slate-500">View location hierarchy</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Location Hierarchy</h2>
            <p className="text-slate-600">
              View your organization structure: Concepts contain Companies, and Companies contain Stores.
            </p>
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-slate-700">{concepts.length} Concepts</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="text-slate-700">{companies.length} Companies</span>
              </div>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-600" />
                <span className="text-slate-700">{stores.length} Stores</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin" />
              </div>
            ) : concepts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No location data</h3>
                <p className="text-slate-600">
                  Import location data to view the hierarchy
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {buildTree()}
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
