import { useState, useEffect } from 'react';
import { ChevronDown, Search, HelpCircle, FileText, Building2, Users, Store, Settings, Monitor, Tag, Package, BarChart3, ChevronLeft, ChevronRight, X, Layers } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import { supabase } from '../lib/supabase';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    concept: true,
    wand: false,
    content: false,
    express: false,
  });
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  useEffect(() => {
    loadData();
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
              <Monitor className="w-5 h-5" />
              <span className="text-sm font-medium">Signage</span>
            </button>
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
              <Tag className="w-5 h-5" />
              <span className="text-sm font-medium">Labels</span>
            </button>
            <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
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
                  <strong>Data loaded:</strong> {brands.length} brands, {companies.length} companies, {sites.length} sites
                </p>
              </div>
            </div>
          </div>
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
