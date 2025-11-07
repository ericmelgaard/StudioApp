import { useState, useEffect, lazy, Suspense } from 'react';
import { HelpCircle, FileText, Building2, Users, Store, Settings, Monitor, Tag, Package, BarChart3, Layers, ImageIcon, MapPin, Database, Sliders, ChevronDown } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import Toast from '../components/Toast';

const SignageManagement = lazy(() => import('./SignageManagement'));
const ShelfLabelManagement = lazy(() => import('./ShelfLabelManagement'));
const ProductManagement = lazy(() => import('./ProductManagement'));
const IntegrationCatalog = lazy(() => import('./IntegrationCatalog'));
const IntegrationDashboard = lazy(() => import('./IntegrationDashboard'));
const IntegrationAccess = lazy(() => import('./IntegrationAccess'));
const ResourceManagement = lazy(() => import('./ResourceManagement'));
const WandTemplateManager = lazy(() => import('./WandTemplateManager'));
const WandIntegrationMapper = lazy(() => import('./WandIntegrationMapper'));
const WandIntegrationLibrary = lazy(() => import('./WandIntegrationLibrary'));
const CoreAttributes = lazy(() => import('./CoreAttributes'));
const WandProducts = lazy(() => import('./WandProducts'));
const UserManagement = lazy(() => import('./UserManagement'));
const LocationSelector = lazy(() => import('../components/LocationSelector'));
const AddUserModal = lazy(() => import('../components/AddUserModal'));
const EditUserModal = lazy(() => import('../components/EditUserModal'));

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string;
  concept_id: number | null;
  company_id: number | null;
  store_id: number | null;
  status: string;
  last_login_at?: string | null;
  created_at: string;
}

interface AdminDashboardProps {
  onBack: () => void;
  user: UserProfile;
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
  const [currentView, setCurrentView] = useState<'dashboard' | 'signage' | 'labels' | 'products' | 'resources' | 'integration' | 'integration-dashboard' | 'integration-access' | 'wand-templates' | 'wand-mapper' | 'integration-sources' | 'core-attributes' | 'wand-products' | 'users'>('dashboard');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [expandedSection, setExpandedSection] = useState<string | null>(() => {
    const saved = localStorage.getItem('adminExpandedSection');
    return saved || null;
  });

  useEffect(() => {
    if (expandedSection) {
      localStorage.setItem('adminExpandedSection', expandedSection);
    } else {
      localStorage.removeItem('adminExpandedSection');
    }
  }, [expandedSection]);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
  };

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
        <aside className="bg-white border-r border-slate-200 text-slate-700 w-64 flex flex-col">
          {/* Location Selector Button */}
          <div className="p-4 border-b border-slate-200">
            <button
              onClick={() => setShowLocationSelector(true)}
              className="w-full flex items-center gap-3 text-sm hover:bg-slate-100 p-3 rounded-lg transition-all border border-slate-200 bg-white group relative"
              title={
                selectedStore && selectedCompany && selectedConcept
                  ? `${selectedConcept.name} > ${selectedCompany.name} > ${selectedStore.name}`
                  : selectedCompany && selectedConcept
                  ? `${selectedConcept.name} > ${selectedCompany.name}`
                  : selectedConcept
                  ? selectedConcept.name
                  : 'WAND Digital - All Locations'
              }
            >
              <Layers className="w-5 h-5 text-slate-600 flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {selectedStore ? selectedStore.name : selectedCompany ? selectedCompany.name : selectedConcept ? selectedConcept.name : 'WAND Digital'}
                </div>
                {selectedStore && selectedCompany && (
                  <div className="text-xs text-slate-600 truncate">
                    {selectedCompany.name}
                  </div>
                )}
              </div>
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Organization Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('organization')}
              className="w-full px-4 mb-2 flex items-center justify-between hover:bg-slate-50 transition-colors py-2 rounded-lg mx-0"
            >
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Organization</div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSection !== 'organization' ? '-rotate-90' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expandedSection !== 'organization' ? 'max-h-0' : 'max-h-96'
              }`}
            >
              <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                <span className="text-sm font-medium">Companies</span>
              </button>
              <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
                <Store className="w-5 h-5" />
                <span className="text-sm font-medium">Sites</span>
              </button>
              <button
                onClick={() => setCurrentView('users')}
                className={`w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 ${
                  currentView === 'users' ? 'bg-slate-100' : ''
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Users</span>
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('content')}
              className="w-full px-4 mb-2 flex items-center justify-between hover:bg-slate-50 transition-colors py-2 rounded-lg mx-0"
            >
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Content</div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSection !== 'content' ? '-rotate-90' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expandedSection !== 'content' ? 'max-h-0' : 'max-h-96'
              }`}
            >
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
          </div>

          {/* Wand Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('wand')}
              className="w-full px-4 mb-2 flex items-center justify-between hover:bg-slate-50 transition-colors py-2 rounded-lg mx-0"
            >
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Wand</div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSection !== 'wand' ? '-rotate-90' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expandedSection !== 'wand' ? 'max-h-0' : 'max-h-96'
              }`}
            >
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
          </div>

          {/* Integration Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('integration')}
              className="w-full px-4 mb-2 flex items-center justify-between hover:bg-slate-50 transition-colors py-2 rounded-lg mx-0"
            >
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Integration</div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSection !== 'integration' ? '-rotate-90' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expandedSection !== 'integration' ? 'max-h-0' : 'max-h-96'
              }`}
            >
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
          </div>

          {/* System Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('system')}
              className="w-full px-4 mb-2 flex items-center justify-between hover:bg-slate-50 transition-colors py-2 rounded-lg mx-0"
            >
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">System</div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSection !== 'system' ? '-rotate-90' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expandedSection !== 'system' ? 'max-h-0' : 'max-h-96'
              }`}
            >
              <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </button>
              <button className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3">
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-medium">Analytics</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
          {currentView === 'signage' && <SignageManagement onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'labels' && <ShelfLabelManagement onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'products' && <ProductManagement onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'resources' && <ResourceManagement onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'wand-products' && <WandProducts />}
          {currentView === 'integration-sources' && <WandIntegrationLibrary onBack={() => setCurrentView('dashboard')} />}
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
          {currentView === 'users' && (
            <UserManagement
              onAddUser={() => setShowAddUserModal(true)}
              onEditUser={(user) => {
                setSelectedUser(user);
                setShowEditUserModal(true);
              }}
            />
          )}
        </Suspense>

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

              {(selectedConcept || selectedCompany || selectedStore) && (
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Current Context:</strong> {selectedStore ? selectedStore.name : selectedCompany ? selectedCompany.name : selectedConcept ? selectedConcept.name : 'All Locations'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Location Selector Modal */}
      {showLocationSelector && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <LocationSelector
            onClose={() => setShowLocationSelector(false)}
            onSelect={(location) => {
              let locationName = '';

              if (Object.keys(location).length === 0) {
                locationName = 'WAND Digital';
                setSelectedConcept(null);
                setSelectedCompany(null);
                setSelectedStore(null);
              } else {
                setSelectedConcept(location.concept || null);
                setSelectedCompany(location.company || null);
                setSelectedStore(location.store || null);

                if (location.store) {
                  locationName = location.store.name;
                } else if (location.company) {
                  locationName = location.company.name;
                } else if (location.concept) {
                  locationName = location.concept.name;
                }
              }

              // Update localStorage and dispatch event for other components
              localStorage.setItem('selectedLocation', JSON.stringify(location));
              window.dispatchEvent(new CustomEvent('locationChange', { detail: location }));

              setToastMessage(`Taking you to ${locationName} now`);
              setShowLocationSelector(false);
            }}
            selectedLocation={{
              concept: selectedConcept || undefined,
              company: selectedCompany || undefined,
              store: selectedStore || undefined,
            }}
          />
        </Suspense>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <Suspense fallback={null}>
          <AddUserModal
            onClose={() => setShowAddUserModal(false)}
            onSuccess={() => {
              setShowAddUserModal(false);
              setToastMessage('User created successfully');
            }}
          />
        </Suspense>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <Suspense fallback={null}>
          <EditUserModal
            user={selectedUser}
            onClose={() => {
              setShowEditUserModal(false);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              setShowEditUserModal(false);
              setSelectedUser(null);
              setToastMessage('User updated successfully');
            }}
          />
        </Suspense>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          duration={2000}
        />
      )}
    </div>
  );
}
