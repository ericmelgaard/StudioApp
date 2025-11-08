import { useState, useEffect, lazy, Suspense } from 'react';
import { Settings, Monitor, Tag, ArrowRight, TrendingUp, Store, Package, HelpCircle, FileText, GripVertical, CheckCircle2, AlertCircle, Clock, ChevronDown, Building2, ImageIcon, Layers, MapPin } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import SystemStatus from '../components/SystemStatus';
import { supabase } from '../lib/supabase';
import LocationSelector from '../components/LocationSelector';

const SignageManagement = lazy(() => import('./SignageManagement'));
const ShelfLabelManagement = lazy(() => import('./ShelfLabelManagement'));
const StoreManagement = lazy(() => import('./StoreManagement'));
const ProductManagement = lazy(() => import('./ProductManagement'));
const ResourceManagement = lazy(() => import('./ResourceManagement'));

type DashboardView = 'home' | 'signage' | 'labels' | 'store' | 'products' | 'resources';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string;
  concept_id: number | null;
  company_id: number | null;
  store_id: number | null;
}

interface OperatorDashboardProps {
  onBack: () => void;
  user: UserProfile;
}

type CardType = 'signage' | 'labels' | 'products' | 'store' | 'status' | 'activity';

interface DashboardCard {
  id: CardType;
  order: number;
}

interface Company {
  id: number;
  name: string;
  concept_id: number | null;
}

interface StoreLocation {
  id: number;
  name: string;
  company_id: number;
}

export default function OperatorDashboard({ onBack, user }: OperatorDashboardProps) {
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('content');
  const [stats, setStats] = useState({
    signageCount: 0,
    signageOnline: 0,
    signageOffline: 0,
    signageHealthy: 0,
    labelsCount: 0,
    labelsSynced: 0,
    labelsOnline: 0,
    labelsOffline: 0,
    labelsHealthy: 0,
    productsCount: 0,
  });
  const [cards, setCards] = useState<DashboardCard[]>([
    { id: 'signage', order: 0 },
    { id: 'labels', order: 1 },
    { id: 'products', order: 2 },
    { id: 'store', order: 3 },
    { id: 'status', order: 4 },
    { id: 'activity', order: 5 },
  ]);
  const [draggedCard, setDraggedCard] = useState<CardType | null>(null);

  useEffect(() => {
    loadCompaniesAndStores();
  }, []);

  useEffect(() => {
    if (selectedCompany || selectedStore) {
      loadStats();
    }
  }, [selectedCompany, selectedStore]);

  const loadCompaniesAndStores = async () => {
    let companiesQuery = supabase.from('companies').select('id, name, concept_id').order('name');
    let storesQuery = supabase.from('stores').select('id, name, company_id').order('name');

    if (user.company_id) {
      companiesQuery = companiesQuery.eq('id', user.company_id);
      storesQuery = storesQuery.eq('company_id', user.company_id);
    }

    const [companiesResult, storesResult] = await Promise.all([
      companiesQuery,
      storesQuery,
    ]);

    if (companiesResult.data) {
      setCompanies(companiesResult.data);
      if (companiesResult.data.length > 0) {
        setSelectedCompany(companiesResult.data[0]);
      }
    }

    if (storesResult.data) {
      setStores(storesResult.data);
    }
  };

  const filteredStores = stores.filter(store =>
    selectedCompany ? store.company_id === selectedCompany.id : true
  );

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setSelectedStore(null);
    setShowCompanyDropdown(false);
  };

  const handleSelectStore = (store: StoreLocation) => {
    setSelectedStore(store);
    setShowCompanyDropdown(false);
  };

  const loadStats = async () => {
    const productsResult = await supabase.from('products').select('mrn', { count: 'exact' });

    const productsCount = productsResult.count || 0;

    setStats({
      signageCount: 0,
      signageOnline: 0,
      signageOffline: 0,
      signageHealthy: 0,
      labelsCount: 0,
      labelsSynced: 0,
      labelsOnline: 0,
      labelsOffline: 0,
      labelsHealthy: 0,
      productsCount,
    });
  };

  const handleDragStart = (cardId: CardType) => {
    setDraggedCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent, targetCardId: CardType) => {
    e.preventDefault();
    if (!draggedCard || draggedCard === targetCardId) return;

    const newCards = [...cards];
    const draggedIndex = newCards.findIndex(c => c.id === draggedCard);
    const targetIndex = newCards.findIndex(c => c.id === targetCardId);

    const [removed] = newCards.splice(draggedIndex, 1);
    newCards.splice(targetIndex, 0, removed);

    newCards.forEach((card, index) => {
      card.order = index;
    });

    setCards(newCards);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const hasLocationSelected = selectedCompany || selectedStore;

  const renderCard = (cardId: CardType) => {
    const isClickableCard = cardId === 'signage' || cardId === 'labels';

    const commonProps = {
      draggable: true,
      onDragStart: () => handleDragStart(cardId),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, cardId),
      onDragEnd: handleDragEnd,
      onClick: isClickableCard ? (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) return;
        if (cardId === 'signage') setCurrentView('signage');
        if (cardId === 'labels') setCurrentView('labels');
      } : undefined,
      className: `bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all ${
        draggedCard === cardId ? 'opacity-50' : ''
      } ${isClickableCard ? 'cursor-pointer' : ''}`,
    };

    switch (cardId) {
      case 'signage':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing drag-handle" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Digital Signage
                </h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Monitor className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.signageCount}</div>
                  <div className="text-sm text-slate-600">Total displays</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-700">{stats.signageOnline}</div>
                    <div className="text-xs text-green-600">Online</div>
                  </div>
                  {stats.signageOffline > 0 && (
                    <div className="bg-amber-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-amber-700">{stats.signageOffline}</div>
                      <div className="text-xs text-amber-600">Offline</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>{stats.signageHealthy} Healthy</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'labels':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing drag-handle" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Shelf Labels
                </h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Tag className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.labelsCount}</div>
                  <div className="text-sm text-slate-600">Total labels</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-700">{stats.labelsOnline}</div>
                    <div className="text-xs text-green-600">Online</div>
                  </div>
                  {stats.labelsOffline > 0 && (
                    <div className="bg-amber-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-amber-700">{stats.labelsOffline}</div>
                      <div className="text-xs text-amber-600">Offline</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>{stats.labelsHealthy} Healthy</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Products
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('products')}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-slate-400 hover:text-slate-900 transition-colors" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Package className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.productsCount}</div>
                  <div className="text-sm text-slate-600">In catalog</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Manage product information and pricing
                </div>
              </div>
            </div>
          </div>
        );

      case 'store':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Store Configuration
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('store')}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-slate-400 hover:text-slate-900 transition-colors" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Store className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-900 font-medium">Placement Groups</div>
                  <div className="text-sm text-slate-600">Configure templates</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Manage store settings and layouts
                </div>
              </div>
            </div>
          </div>
        );

      case 'status':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  System Status
                </h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-700">All systems operational</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                Last checked: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Recent Activity
                </h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-900">No recent changes</div>
                  <div className="text-xs text-slate-500">Demo mode</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (currentView === 'signage') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <SignageManagement onBack={() => setCurrentView('home')} />
      </Suspense>
    );
  }

  if (currentView === 'labels') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <ShelfLabelManagement onBack={() => setCurrentView('home')} />
      </Suspense>
    );
  }

  if (currentView === 'store') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <StoreManagement
          onBack={() => setCurrentView('home')}
          initialStore={selectedStore || undefined}
        />
      </Suspense>
    );
  }

  if (currentView === 'products') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <ProductManagement onBack={() => setCurrentView('home')} />
      </Suspense>
    );
  }

  if (currentView === 'resources') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <ResourceManagement onBack={() => setCurrentView('home')} />
      </Suspense>
    );
  }

  // Show sidebar navigation when location is selected
  if (hasLocationSelected) {
    return (
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <img
                src="/WandLogoNoText.png"
                alt="WAND"
                className="h-8 w-8"
              />
              <div>
                <div className="font-bold text-slate-900">WAND Digital</div>
                <div className="text-xs text-slate-600">Operator Studio</div>
              </div>
            </div>
          </div>

          {/* Location Display */}
          <div className="p-4 border-b border-slate-200">
            <button
              onClick={() => setShowLocationSelector(true)}
              className={`w-full px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showLocationSelector
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-5 h-5 text-slate-600 flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {selectedStore ? selectedStore.name : selectedCompany?.name || 'Select Location'}
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
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {currentView === 'home' ? 'Dashboard' :
                 currentView === 'signage' ? 'Signage Management' :
                 currentView === 'labels' ? 'Shelf Label Management' :
                 currentView === 'products' ? 'Product Management' :
                 currentView === 'resources' ? 'Resource Management' :
                 currentView === 'store' ? 'Store Configuration' : 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationPanel />
              <UserMenu role="operator" onBackToRoles={onBack} />
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-slate-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedCards.map(card => renderCard(card.id))}
              </div>
            </main>
          </div>
        </div>

        {/* Location Selector Modal */}
        {showLocationSelector && (
          <LocationSelector
            onClose={() => setShowLocationSelector(false)}
          />
        )}
      </div>
    );
  }

  // No location selected - show location selection screen
  return (
    <div className="min-h-screen bg-slate-50" onClick={() => setShowCompanyDropdown(false)}>
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <img
                  src="/WandLogoNoText.png"
                  alt="WAND"
                  className="h-8 w-8"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">WAND Digital</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-base font-semibold text-slate-700">Studio</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCompanyDropdown(!showCompanyDropdown);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  {selectedStore ? (
                    <Store className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Building2 className="w-4 h-4 text-slate-600" />
                  )}
                  <span className="text-sm font-medium text-slate-900">
                    {selectedStore ? selectedStore.name : selectedCompany?.name || 'Select Location'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showCompanyDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                        Companies
                      </div>
                      {companies.map(company => (
                        <button
                          key={company.id}
                          onClick={() => handleSelectCompany(company)}
                          className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors ${
                            selectedCompany?.id === company.id && !selectedStore
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="text-sm font-medium">{company.name}</span>
                          </div>
                        </button>
                      ))}

                      {selectedCompany && filteredStores.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase mt-2 border-t border-slate-100">
                            Stores in {selectedCompany.name}
                          </div>
                          {filteredStores.map(store => (
                            <button
                              key={store.id}
                              onClick={() => handleSelectStore(store)}
                              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors ${
                                selectedStore?.id === store.id
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 pl-4">
                                <Store className="w-4 h-4" />
                                <span className="text-sm">{store.name}</span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
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
              <UserMenu role="operator" onBackToRoles={onBack} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Location</h2>
          <p className="text-slate-600 mb-6">Choose a company or store from the dropdown above to get started</p>
        </div>
      </main>
    </div>
  );
}
