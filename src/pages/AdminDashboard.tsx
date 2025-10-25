import { useState, useEffect } from 'react';
import { Shield, Menu, X, ChevronDown, ChevronRight, Search, HelpCircle, User, ArrowLeft, FileText } from 'lucide-react';
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
            <span className="text-base font-semibold text-slate-700">TRM</span>
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
        <aside className={`bg-slate-800 text-slate-100 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } flex flex-col min-h-[calc(100vh-4rem)]`}>
          {/* Collapse Toggle */}
          <div className="flex items-center justify-end px-4 py-3 border-b border-slate-700">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          {/* Current Selection */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-slate-700">
            <div className="space-y-2">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Concept</div>
                <button
                  onClick={() => setShowLocationSelector(!showLocationSelector)}
                  className="w-full flex items-center justify-between text-sm hover:bg-slate-700 p-2 rounded transition-colors"
                >
                  <span className="font-medium">{selectedBrand?.name || 'Select Concept'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {selectedCompany && (
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Company</div>
                  <div className="text-sm p-2 bg-slate-700/50 rounded">
                    {selectedCompany.name}
                  </div>
                </div>
              )}

              {selectedSite && (
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Store</div>
                  <div className="text-sm p-2 bg-slate-700/50 rounded">
                    {selectedSite.name}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* WAND Section */}
          <div className="mb-2">
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">WAND</div>
            </div>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Enterprise</span>}
            </button>
            <button
              onClick={() => toggleSection('wand')}
              className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors flex items-center justify-between"
            >
              {!sidebarCollapsed && <span className="text-sm">Digital</span>}
              {!sidebarCollapsed && (expandedSections.wand ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
            </button>
          </div>

          {/* CONTENT Section */}
          <div className="mb-2">
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">CONTENT</div>
            </div>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Displays</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Menu Composer</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Responsive Menu Settings</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Smart Labels</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Smart Tags</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Assets</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Campaigns</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Deployments</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Content Forecaster</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Price Scheduler</span>}
            </button>
          </div>

          {/* EXPRESS Section */}
          <div>
            <div className="px-4 mb-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">EXPRESS</div>
            </div>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Point-of-Sale</span>}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors">
              {!sidebarCollapsed && <span className="text-sm">Reporting</span>}
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
