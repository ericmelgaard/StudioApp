import { useState, useEffect } from 'react';
import { ChevronDown, Search, HelpCircle, FileText, Building2, Users, Store, Settings, Monitor, Tag, Package, BarChart3, ChevronLeft, ChevronRight, X, Layers, ArrowRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import { supabase } from '../lib/supabase';
import SignageManagement from './SignageManagement';
import ShelfLabelManagement from './ShelfLabelManagement';
import ProductManagement from './ProductManagement';

interface AdminDashboardProps {
  onBack: () => void;
}

interface Brand {
  id: string;
  name: string;
  code: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Site {
  id: string;
  company_id: string;
  brand_id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'signage' | 'labels' | 'products'>('dashboard');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const [signageStats, setSignageStats] = useState({ total: 0, online: 0, offline: 0, healthy: 0 });
  const [labelStats, setLabelStats] = useState({ total: 0, online: 0, offline: 0, healthy: 0 });

  useEffect(() => {
    loadData();
    loadStats();
  }, []);

  const loadData = async () => {
    const { data: brandsData } = await supabase.from('brands').select('*').order('name');
    const { data: companiesData } = await supabase.from('companies').select('*').order('name');
    const { data: sitesData } = await supabase.from('sites').select('*').order('name');

    if (brandsData) setBrands(brandsData);
    if (companiesData) setCompanies(companiesData);
    if (sitesData) setSites(sitesData);

    if (brandsData && brandsData.length > 0) {
      setSelectedBrand(brandsData[0]);
    }
  };

  const loadStats = async () => {
    const { data: signageData } = await supabase.from('digital_signage').select('status');
    const { data: labelData } = await supabase.from('hardware_devices').select('status, health_status');

    if (signageData) {
      const online = signageData.filter(s => s.status === 'online').length;
      const offline = signageData.filter(s => s.status === 'offline').length;
      const healthy = signageData.filter(s => s.status === 'online').length;
      setSignageStats({ total: signageData.length, online, offline, healthy });
    }

    if (labelData) {
      const online = labelData.filter(l => l.status === 'online').length;
      const offline = labelData.filter(l => l.status === 'offline').length;
      const healthy = labelData.filter(l => l.health_status === 'healthy').length;
      setLabelStats({ total: labelData.length, online, offline, healthy });
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.state?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
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

      <div className="flex">
        {/* Left Sidebar Navigation */}
        <aside className="bg-white border-r border-slate-200 text-slate-700 w-64 flex flex-col min-h-[calc(100vh-4rem)]">
          {/* Current Selection */}
          <div className="p-4 border-b border-slate-200">
            <div className="space-y-3">
              <button
                onClick={() => setShowLocationSelector(!showLocationSelector)}
                className="w-full flex items-center gap-3 text-sm hover:bg-slate-100 p-3 rounded-lg transition-colors border border-slate-200 bg-white"
              >
                <Layers className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Context</div>
                  <div className="font-medium text-slate-900">{selectedBrand?.name || 'Select Concept'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {selectedCompany && (
                <div className="pl-3 border-l-2 border-slate-200">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Company</div>
                  <div className="text-sm font-medium text-slate-700">
                    {selectedCompany.name}
                  </div>
                </div>
              )}

              {selectedSite && (
                <div className="pl-3 border-l-2 border-slate-200">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Store</div>
                  <div className="text-sm font-medium text-slate-700">
                    {selectedSite.name}
                  </div>
                </div>
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

        {currentView === 'dashboard' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                System Administration
              </h2>
              <p className="text-slate-600">
                Monitor and manage your digital signage and shelf label systems
              </p>
            </div>

            {/* Content Management Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Digital Signage Card */}
              <div
                onClick={() => setCurrentView('signage')}
                className="bg-white rounded-lg shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Digital Signage</h3>
                        <p className="text-sm text-slate-500">Manage displays and content</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-slate-900">{signageStats.total}</div>
                      <div className="text-xs text-slate-600">Total Devices</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-700">{signageStats.online}</div>
                      <div className="text-xs text-green-700">Online</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>{signageStats.healthy} Healthy</span>
                    </div>
                    {signageStats.offline > 0 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>{signageStats.offline} Offline</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Shelf Labels Card */}
              <div
                onClick={() => setCurrentView('labels')}
                className="bg-white rounded-lg shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Tag className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Shelf Labels</h3>
                        <p className="text-sm text-slate-500">Electronic shelf label system</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-slate-900">{labelStats.total}</div>
                      <div className="text-xs text-slate-600">Total Devices</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-700">{labelStats.online}</div>
                      <div className="text-xs text-green-700">Online</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>{labelStats.healthy} Healthy</span>
                    </div>
                    {labelStats.offline > 0 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>{labelStats.offline} Offline</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* System Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Users & Access</h3>
                </div>
                <p className="text-slate-600 text-sm">Manage user accounts and permissions</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">System Config</h3>
                </div>
                <p className="text-slate-600 text-sm">Configure global system settings</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <HelpCircle className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Support Tools</h3>
                </div>
                <p className="text-slate-600 text-sm">Access diagnostic and support features</p>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Location Selector Overlay */}
      {showLocationSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-start">
          <div className="bg-slate-700 text-white w-96 h-full shadow-xl">
            <div className="p-4 border-b border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Change Level</h3>
                <button
                  onClick={() => setShowLocationSelector(false)}
                  className="p-1 hover:bg-slate-600 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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

            <div className="overflow-y-auto h-[calc(100vh-180px)]">
              {/* Brands */}
              <div className="p-4">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  {brands.length} Concepts
                </div>
                <div className="space-y-1">
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setSelectedCompany(null);
                        setSelectedSite(null);
                        setShowLocationSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors ${
                        selectedBrand?.id === brand.id ? 'bg-slate-600' : ''
                      }`}
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Companies */}
              <div className="p-4 border-t border-slate-600">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  {filteredCompanies.length} Companies
                </div>
                <div className="space-y-1">
                  {filteredCompanies.slice(0, 10).map((company) => (
                    <button
                      key={company.id}
                      onClick={() => {
                        setSelectedCompany(company);
                        setSelectedSite(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors ${
                        selectedCompany?.id === company.id ? 'bg-slate-600' : ''
                      }`}
                    >
                      <div>{company.name}</div>
                      <div className="text-xs text-slate-400">({company.code})</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sites */}
              {selectedCompany && (
                <div className="p-4 border-t border-slate-600">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                    Stores
                  </div>
                  <div className="space-y-1">
                    {sites
                      .filter(s => s.company_id === selectedCompany.id)
                      .map((site) => (
                        <button
                          key={site.id}
                          onClick={() => {
                            setSelectedSite(site);
                            setShowLocationSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors ${
                            selectedSite?.id === site.id ? 'bg-slate-600' : ''
                          }`}
                        >
                          <div>{site.name}</div>
                          {site.city && site.state && (
                            <div className="text-xs text-slate-400">
                              {site.city}, {site.state}
                            </div>
                          )}
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
