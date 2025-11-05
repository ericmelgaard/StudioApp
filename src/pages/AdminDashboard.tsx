import { useState, useEffect } from 'react';
import { ChevronDown, Search, HelpCircle, FileText, Building2, Users, Store, Settings, Monitor, Tag, Package, BarChart3, ChevronLeft, ChevronRight, X, Layers, ImageIcon, Wand2, MapPin, Database, Sliders } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import { supabase } from '../lib/supabase';
import SignageManagement from './SignageManagement';
import ShelfLabelManagement from './ShelfLabelManagement';
import ProductManagement from './ProductManagement';
import IntegrationCatalog from './IntegrationCatalog';
import IntegrationDashboard from './IntegrationDashboard';
import IntegrationAccess from './IntegrationAccess';
import ResourceManagement from './ResourceManagement';
import WandTemplateManager from './WandTemplateManager';
import WandIntegrationMapper from './WandIntegrationMapper';
import IntegrationSources from './IntegrationSources';
import CoreAttributes from './CoreAttributes';
import WandProducts from './WandProducts';

interface AdminDashboardProps {
  onBack: () => void;
}

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

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'signage' | 'labels' | 'products' | 'resources' | 'integration' | 'integration-dashboard' | 'integration-access' | 'wand-templates' | 'wand-mapper' | 'integration-sources' | 'core-attributes' | 'wand-products'>('dashboard');

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    concepts: Concept[];
    companies: Company[];
    stores: Store[];
  }>({ concepts: [], companies: [], stores: [] });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: conceptsData } = await supabase.from('concepts').select('*').order('name');
    const { data: companiesData } = await supabase.from('companies').select('*').order('name');

    if (conceptsData) setConcepts(conceptsData);
    if (companiesData) setCompanies(companiesData);
  };

  const loadStoresForCompany = async (companyId: number) => {
    setLoadingStores(true);
    const { data: storesData } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    console.log('Loaded stores for company', companyId, ':', storesData?.length, 'stores');
    if (storesData) setStores(storesData);
    setLoadingStores(false);
  };

  useEffect(() => {
    if (selectedCompany) {
      loadStoresForCompany(selectedCompany.id);
    } else {
      setStores([]);
    }
  }, [selectedCompany]);


  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ concepts: [], companies: [], stores: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const query = searchQuery.toLowerCase();

      const matchedConcepts = concepts.filter(c =>
        c.name.toLowerCase().includes(query)
      );

      const matchedCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(query)
      );

      const { data: matchedStores } = await supabase
        .from('stores')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .order('name')
        .limit(50);

      setSearchResults({
        concepts: matchedConcepts,
        companies: matchedCompanies,
        stores: matchedStores || []
      });
      setIsSearching(false);
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, concepts, companies]);

  const filteredConcepts = searchQuery ? searchResults.concepts : concepts.filter(c =>
    !selectedConcept || c.id === selectedConcept.id
  );

  const filteredCompanies = searchQuery ? searchResults.companies : companies.filter(c =>
    !selectedConcept || c.concept_id === selectedConcept.id
  );

  const filteredStores = searchQuery ? searchResults.stores : stores;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img
            src="/WandLogoNoText.png"
            alt="WAND"
            className="h-8 w-8"
          />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">WAND Digital</span>
            <span className="text-slate-400">|</span>
            <span className="text-base font-semibold text-slate-700">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Documentation"
          >
            <FileText className="w-5 h-5" />
          </button>
          <NotificationPanel />
          <UserMenu role="admin" onBackToRoles={onBack} />
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar Navigation */}
        <aside className="bg-white border-r border-slate-200 text-slate-700 w-64 flex flex-col overflow-y-auto">
          {/* Current Selection */}
          <div className="p-4 border-b border-slate-200">
            <div className="space-y-2">
              <button
                onClick={() => setShowLocationSelector(!showLocationSelector)}
                className="w-full flex items-center gap-3 text-sm hover:bg-slate-100 p-3 rounded-lg transition-all border border-slate-200 bg-white"
              >
                <Layers className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Location Context</div>
                  <div className="font-medium text-slate-900 truncate">{selectedConcept?.name || 'All Concepts'}</div>
                  {selectedCompany && (
                    <div className="text-xs text-slate-600 truncate animate-in fade-in slide-in-from-top-1 duration-200">
                      {selectedCompany.name}
                    </div>
                  )}
                  {selectedStore && (
                    <div className="text-xs text-slate-500 truncate animate-in fade-in slide-in-from-top-1 duration-200">
                      {selectedStore.name}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {(selectedConcept || selectedCompany || selectedStore) && (
                <button
                  onClick={() => {
                    setSelectedConcept(null);
                    setSelectedCompany(null);
                    setSelectedStore(null);
                  }}
                  className="w-full text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <X className="w-3 h-3" />
                  Clear Selection
                </button>
              )}
            </div>
          </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Organization Section */}
          <div className="mb-6">
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Organization</div>
            </div>
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-medium">Companies</span>
            </button>
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
              <Store className="w-5 h-5" />
              <span className="text-sm font-medium">Sites</span>
            </button>
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Users</span>
            </button>
          </div>

          {/* Content Section */}
          <div className="mb-6">
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Content</div>
            </div>
            <button
              onClick={() => setCurrentView('signage')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'signage' ? 'bg-slate-100' : ''
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-sm font-medium">Signage</span>
            </button>
            <button
              onClick={() => setCurrentView('labels')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'labels' ? 'bg-slate-100' : ''
              }`}
            >
              <Tag className="w-5 h-5" />
              <span className="text-sm font-medium">Labels</span>
            </button>
            <button
              onClick={() => setCurrentView('products')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'products' ? 'bg-slate-100' : ''
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-sm font-medium">Products</span>
            </button>
            <button
              onClick={() => setCurrentView('resources')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'resources' ? 'bg-slate-100' : ''
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Resources</span>
            </button>
          </div>

          {/* Wand Section */}
          <div className="mb-6">
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Wand</div>
            </div>
            <button
              onClick={() => setCurrentView('wand-products')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'wand-products' ? 'bg-slate-100' : ''
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-sm font-medium">Product Library</span>
            </button>
            <button
              onClick={() => setCurrentView('integration-sources')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'integration-sources' ? 'bg-slate-100' : ''
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="text-sm font-medium">Integration Sources</span>
            </button>
            <button
              onClick={() => setCurrentView('core-attributes')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'core-attributes' ? 'bg-slate-100' : ''
              }`}
            >
              <Sliders className="w-5 h-5" />
              <span className="text-sm font-medium">Core Attributes</span>
            </button>
            <button
              onClick={() => setCurrentView('wand-templates')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'wand-templates' ? 'bg-slate-100' : ''
              }`}
            >
              <Layers className="w-5 h-5" />
              <span className="text-sm font-medium">Manage Templates</span>
            </button>
            <button
              onClick={() => setCurrentView('wand-mapper')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'wand-mapper' ? 'bg-slate-100' : ''
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium">Map Integration Templates</span>
            </button>
          </div>

          {/* Integration Section */}
          <div className="mb-6">
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Integration</div>
            </div>
            <button
              onClick={() => setCurrentView('integration-dashboard')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'integration-dashboard' ? 'bg-slate-100' : ''
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentView('integration-access')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'integration-access' ? 'bg-slate-100' : ''
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Access</span>
            </button>
            <button
              onClick={() => setCurrentView('integration')}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                currentView === 'integration' ? 'bg-slate-100' : ''
              }`}
            >
              <Layers className="w-5 h-5" />
              <span className="text-sm font-medium">Catalog</span>
            </button>
          </div>

          {/* System Section */}
          <div className="mb-6">
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">System</div>
            </div>
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Settings</span>
            </button>
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">Analytics</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        {currentView === 'signage' && <SignageManagement onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'labels' && <ShelfLabelManagement onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'products' && <ProductManagement onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'resources' && <ResourceManagement onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'wand-products' && <WandProducts />}
        {currentView === 'integration-sources' && <IntegrationSources onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'core-attributes' && <CoreAttributes onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'wand-templates' && <WandTemplateManager onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'wand-mapper' && <WandIntegrationMapper onBack={() => setCurrentView('dashboard')} />}
        {currentView === 'integration-dashboard' && (
          <IntegrationDashboard
            onNavigate={(page) => setCurrentView(page === 'access' ? 'integration-access' : 'integration')}
          />
        )}
        {currentView === 'integration-access' && <IntegrationAccess />}
        {currentView === 'integration' && <IntegrationCatalog />}

        {currentView === 'dashboard' && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                System Administration
              </h2>
              <p className="text-slate-600 mb-6">
                Configure system-wide settings and access support features.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <h3 className="font-semibold text-slate-900 mb-2">Users & Access</h3>
                  <p className="text-slate-600 text-sm">Manage user accounts and permissions</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <h3 className="font-semibold text-slate-900 mb-2">System Config</h3>
                  <p className="text-slate-600 text-sm">Configure global system settings</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <h3 className="font-semibold text-slate-900 mb-2">Support Tools</h3>
                  <p className="text-slate-600 text-sm">Access diagnostic and support features</p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Data loaded:</strong> {concepts.length} concepts, {companies.length} companies, {groups.length} groups
                  {selectedCompany && stores.length > 0 && <span>, {stores.length} stores in {selectedCompany.name}</span>}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Location Selector Overlay */}
      {showLocationSelector && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-start">
          <div className="bg-slate-700 text-white w-96 h-full shadow-xl">
            <div className="p-4 border-b border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Select Location</h3>
                <button
                  onClick={() => setShowLocationSelector(false)}
                  className="p-1 hover:bg-slate-600 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Breadcrumb */}
              {(selectedConcept || selectedCompany) && (
                <div className="mb-4 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                  {selectedConcept && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedConcept(null);
                          setSelectedCompany(null);
                          setSelectedStore(null);
                        }}
                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded transition-colors font-medium flex items-center gap-1.5 group"
                      >
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                        All Concepts
                      </button>
                      {selectedCompany && (
                        <>
                          <ChevronRight className="w-3 h-3 text-slate-500" />
                          <button
                            onClick={() => {
                              setSelectedCompany(null);
                              setSelectedStore(null);
                            }}
                            className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded transition-colors font-medium flex items-center gap-1.5 group"
                          >
                            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                            {selectedConcept.name}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type to search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 rounded border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto h-[calc(100vh-240px)]">
              {/* Search Results */}
              {searchQuery && (
                <div className="p-4 space-y-4">
                  {searchResults.concepts.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                        {searchResults.concepts.length} Concepts
                      </div>
                      <div className="space-y-1">
                        {searchResults.concepts.map((concept) => (
                          <button
                            key={concept.id}
                            onClick={() => {
                              setSelectedConcept(concept);
                              setSelectedCompany(null);
                              setSelectedStore(null);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span>{concept.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.companies.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                        {searchResults.companies.length} Companies
                      </div>
                      <div className="space-y-1">
                        {searchResults.companies.map((company) => {
                          const concept = concepts.find(c => c.id === company.concept_id);
                          return (
                            <button
                              key={company.id}
                              onClick={() => {
                                const concept = concepts.find(c => c.id === company.concept_id);
                                if (concept) setSelectedConcept(concept);
                                setSelectedCompany(company);
                                setSelectedStore(null);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <div className="flex-1">
                                  <div>{company.name}</div>
                                  {concept && <div className="text-xs text-slate-400">{concept.name}</div>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {searchResults.stores.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                        {searchResults.stores.length} Stores
                      </div>
                      <div className="space-y-1">
                        {searchResults.stores.map((store) => {
                          const company = companies.find(c => c.id === store.company_id);
                          const concept = company ? concepts.find(c => c.id === company.concept_id) : null;
                          return (
                            <button
                              key={store.id}
                              onClick={() => {
                                if (concept) setSelectedConcept(concept);
                                if (company) setSelectedCompany(company);
                                setSelectedStore(store);
                                setSearchQuery('');
                                setShowLocationSelector(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Store className="w-4 h-4 text-slate-400" />
                                <div className="flex-1">
                                  <div>{store.name}</div>
                                  {company && <div className="text-xs text-slate-400">{company.name}</div>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {searchResults.concepts.length === 0 && searchResults.companies.length === 0 && searchResults.stores.length === 0 && !isSearching && (
                    <div className="text-center py-8 text-slate-400">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}

              {/* Concepts */}
              {!searchQuery && !selectedConcept && (
                <div className="p-4">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">
                    {concepts.length} Concepts
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {concepts.map((concept) => {
                      const conceptCompanies = companies.filter(c => c.concept_id === concept.id);
                      return (
                        <button
                          key={concept.id}
                          onClick={() => {
                            setSelectedConcept(concept);
                            setSelectedCompany(null);
                            setSelectedStore(null);
                          }}
                          className="text-left px-3 py-2.5 rounded text-sm hover:bg-slate-600 transition-all border border-slate-600 hover:border-slate-500 group"
                        >
                          <div className="font-medium truncate mb-0.5">{concept.name}</div>
                          <div className="text-xs text-slate-400 group-hover:text-slate-300">{conceptCompanies.length} companies</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Companies */}
              {!searchQuery && selectedConcept && !selectedCompany && (
                <div className="p-4">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                    {companies.filter(c => c.concept_id === selectedConcept.id).length} Companies in {selectedConcept.name}
                  </div>
                  <div className="space-y-1">
                    {companies
                      .filter(c => c.concept_id === selectedConcept.id)
                      .map((company) => {
                        return (
                          <button
                            key={company.id}
                            onClick={() => {
                              setSelectedCompany(company);
                              setSelectedStore(null);
                            }}
                            className="w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors flex items-center justify-between"
                          >
                            <span>{company.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Stores */}
              {!searchQuery && selectedCompany && (
                <div className="p-4">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                    {stores.filter(s => s.company_id === selectedCompany.id).length} Stores in {selectedCompany.name}
                  </div>
                  <div className="space-y-1">
                    {stores
                      .filter(s => s.company_id === selectedCompany.id)
                      .map((store) => (
                        <button
                          key={store.id}
                          onClick={() => {
                            setSelectedStore(store);
                            setShowLocationSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors ${
                            selectedStore?.id === store.id ? 'bg-slate-600' : ''
                          }`}
                        >
                          <div>{store.name}</div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
