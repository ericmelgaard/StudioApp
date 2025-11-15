import { useState, useEffect, lazy, Suspense } from 'react';
import { HelpCircle, FileText, Building2, Users, Store, Settings, Monitor, Tag, Package, BarChart3, Layers, ImageIcon, MapPin, Database, Sliders, FileCode } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import Toast from '../components/Toast';
import { useLocation } from '../hooks/useLocation';

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
const AttributeTemplates = lazy(() => import('./AttributeTemplates'));
const WandProducts = lazy(() => import('./WandProducts'));
const UserManagement = lazy(() => import('./UserManagement'));
const SiteConfiguration = lazy(() => import('./SiteConfiguration'));
const LocationSelector = lazy(() => import('../components/LocationSelector'));
const HeaderNavigation = lazy(() => import('../components/HeaderNavigation'));
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

type ViewType = 'dashboard' | 'signage' | 'labels' | 'products' | 'resources' | 'integration' | 'integration-dashboard' | 'integration-access' | 'wand-templates' | 'wand-mapper' | 'integration-sources' | 'core-attributes' | 'attribute-templates' | 'wand-products' | 'users' | 'sites';

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { location, setLocation, getLocationDisplay } = useLocation();
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Local state synced with global location context
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // Sync local state with global location context on mount and location changes
  useEffect(() => {
    setSelectedConcept(location.concept || null);
    setSelectedCompany(location.company || null);
    setSelectedStore(location.store || null);
  }, [location]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'organization' | 'content' | 'wand' | 'integration' | 'system' | null>(null);

  const navigationMenus = {
    organization: [
      { id: 'sites' as ViewType, label: 'Location Manager', icon: MapPin },
      { id: 'users' as ViewType, label: 'Users', icon: Users },
    ],
    content: [
      { id: 'signage' as ViewType, label: 'Signage', icon: Monitor },
      { id: 'labels' as ViewType, label: 'Labels', icon: Tag },
      { id: 'products' as ViewType, label: 'Products', icon: Package },
      { id: 'resources' as ViewType, label: 'Resources', icon: ImageIcon },
    ],
    wand: [
      { id: 'wand-products' as ViewType, label: 'Product Library', icon: Package },
      { id: 'integration-sources' as ViewType, label: 'Integration Sources', icon: Database },
      { id: 'core-attributes' as ViewType, label: 'Core Attributes', icon: Sliders },
      { id: 'attribute-templates' as ViewType, label: 'Attribute Templates', icon: FileCode },
      { id: 'wand-templates' as ViewType, label: 'Manage Templates', icon: Layers },
      { id: 'wand-mapper' as ViewType, label: 'Map Integration Templates', icon: MapPin },
    ],
    integration: [
      { id: 'integration-dashboard' as ViewType, label: 'Dashboard', icon: BarChart3 },
      { id: 'integration-access' as ViewType, label: 'Access', icon: Settings },
      { id: 'integration' as ViewType, label: 'Catalog', icon: Layers },
    ],
    system: [
      { label: 'Settings', icon: Settings },
      { label: 'Analytics', icon: BarChart3 },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200">
        <div className="h-full flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
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
            <Suspense fallback={<div className="w-48 h-10 bg-slate-100 rounded-lg animate-pulse"></div>}>
              <HeaderNavigation
                userConceptId={null}
                userCompanyId={null}
                userStoreId={null}
                onOpenFullNavigator={() => setShowLocationSelector(true)}
              />
            </Suspense>
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
        </div>
      </header>

      {/* Horizontal Navigation Menu */}
      <nav className="bg-white border-b border-slate-200">
        <div className="px-6 flex items-center gap-1">
          {/* Organization Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'organization' ? null : 'organization')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeMenu === 'organization' || ['sites', 'users'].includes(currentView)
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Organization
            </button>
            {activeMenu === 'organization' && (
              <div className="absolute top-full left-0 mt-0 w-64 bg-white rounded-b-lg shadow-lg border border-slate-200 py-1 z-50">
                {navigationMenus.organization.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setActiveMenu(null);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                        currentView === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Content Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'content' ? null : 'content')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeMenu === 'content' || ['signage', 'labels', 'products', 'resources'].includes(currentView)
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Content
            </button>
            {activeMenu === 'content' && (
              <div className="absolute top-full left-0 mt-0 w-64 bg-white rounded-b-lg shadow-lg border border-slate-200 py-1 z-50">
                {navigationMenus.content.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setActiveMenu(null);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                        currentView === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wand Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'wand' ? null : 'wand')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeMenu === 'wand' || ['wand-products', 'integration-sources', 'core-attributes', 'attribute-templates', 'wand-templates', 'wand-mapper'].includes(currentView)
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Wand
            </button>
            {activeMenu === 'wand' && (
              <div className="absolute top-full left-0 mt-0 w-72 bg-white rounded-b-lg shadow-lg border border-slate-200 py-1 z-50">
                {navigationMenus.wand.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setActiveMenu(null);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                        currentView === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Integration Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'integration' ? null : 'integration')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeMenu === 'integration' || ['integration-dashboard', 'integration-access', 'integration'].includes(currentView)
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Integration
            </button>
            {activeMenu === 'integration' && (
              <div className="absolute top-full left-0 mt-0 w-64 bg-white rounded-b-lg shadow-lg border border-slate-200 py-1 z-50">
                {navigationMenus.integration.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setActiveMenu(null);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                        currentView === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* System Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'system' ? null : 'system')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeMenu === 'system'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              System
            </button>
            {activeMenu === 'system' && (
              <div className="absolute top-full left-0 mt-0 w-64 bg-white rounded-b-lg shadow-lg border border-slate-200 py-1 z-50">
                {navigationMenus.system.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="p-6">
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
          {currentView === 'signage' && <SignageManagement onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'labels' && <ShelfLabelManagement onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'products' && <ProductManagement showBackButton={false} />}
          {currentView === 'resources' && <ResourceManagement onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'wand-products' && <WandProducts />}
          {currentView === 'integration-sources' && <WandIntegrationLibrary onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'core-attributes' && <CoreAttributes onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'attribute-templates' && <AttributeTemplates onBack={() => setCurrentView('dashboard')} />}
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
          {currentView === 'sites' && <SiteConfiguration />}
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

      {/* Location Selector Modal */}
      {showLocationSelector && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <LocationSelector
            onClose={() => setShowLocationSelector(false)}
            onSelect={(selectedLocation) => {
              // Update global location context (which handles localStorage and events)
              setLocation(selectedLocation);

              // Determine location name for toast
              let locationName = 'WAND Digital';
              if (selectedLocation.store) {
                locationName = selectedLocation.store.name;
              } else if (selectedLocation.company) {
                locationName = selectedLocation.company.name;
              } else if (selectedLocation.concept) {
                locationName = selectedLocation.concept.name;
              }

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
