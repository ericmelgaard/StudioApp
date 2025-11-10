import { useState, useEffect, lazy, Suspense } from 'react';
import { Settings, Monitor, Tag, ArrowRight, TrendingUp, Store, Package, HelpCircle, FileText, GripVertical, CheckCircle2, AlertCircle, Clock, Building2, ChevronDown, Map } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import SystemStatus from '../components/SystemStatus';
import { supabase } from '../lib/supabase';
import { useLocation } from '../hooks/useLocation';

const SignageManagement = lazy(() => import('./SignageManagement'));
const ShelfLabelManagement = lazy(() => import('./ShelfLabelManagement'));
const StoreManagement = lazy(() => import('./StoreManagement'));
const ProductManagement = lazy(() => import('./ProductManagement'));
const LocationSelector = lazy(() => import('../components/LocationSelector'));
const HeaderNavigation = lazy(() => import('../components/HeaderNavigation'));

type DashboardView = 'home' | 'signage' | 'labels' | 'store' | 'products';

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

type CardType = 'signage' | 'labels' | 'products' | 'store' | 'status' | 'activity';

interface DashboardCard {
  id: CardType;
  order: number;
}

export default function OperatorDashboard({ onBack, user }: OperatorDashboardProps) {
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const { location, setLocation, clearHistory } = useLocation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [storesByCompany, setStoresByCompany] = useState<Record<number, Store[]>>({});
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  useEffect(() => {
    if (currentView === 'home') {
      clearHistory();
    }
    loadCompaniesAndStores();
    loadStats();
  }, [location, currentView]);

  const loadCompaniesAndStores = async () => {
    setLoading(true);

    // Load companies based on user access
    let companiesQuery = supabase.from('companies').select('id, name, concept_id');

    if (user.concept_id) {
      companiesQuery = companiesQuery.eq('concept_id', user.concept_id);
    }

    if (user.company_id) {
      companiesQuery = companiesQuery.eq('id', user.company_id);
    }

    const { data: companiesData, error: companiesError } = await companiesQuery.order('name');

    if (companiesError) {
      console.error('Error loading companies:', companiesError);
      setLoading(false);
      return;
    }

    setCompanies(companiesData || []);

    // Load stores for each company
    if (companiesData && companiesData.length > 0) {
      const companyIds = companiesData.map(c => c.id);

      let storesQuery = supabase
        .from('stores')
        .select('id, name, company_id')
        .in('company_id', companyIds);

      if (user.store_id) {
        storesQuery = storesQuery.eq('id', user.store_id);
      }

      const { data: storesData, error: storesError } = await storesQuery.order('name');

      if (storesError) {
        console.error('Error loading stores:', storesError);
      } else if (storesData) {
        // Group stores by company
        const grouped: Record<number, Store[]> = {};
        storesData.forEach(store => {
          if (!grouped[store.company_id]) {
            grouped[store.company_id] = [];
          }
          grouped[store.company_id].push(store);
        });
        setStoresByCompany(grouped);

        // Set initial selection
        if (location.store) {
          setSelectedStore(location.store);
          const company = companiesData.find(c => c.id === location.store?.company_id);
          if (company) setSelectedCompany(company);
        } else if (location.company) {
          setSelectedCompany(location.company);
        } else if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0]);
        }
      }
    }

    setLoading(false);
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setSelectedStore(null);
    setLocation({ company, store: undefined, concept: location.concept });
  };

  const handleStoreSelect = (store: Store) => {
    const company = companies.find(c => c.id === store.company_id);
    if (company) {
      setSelectedCompany(company);
      setSelectedStore(store);
      setLocation({ company, store, concept: location.concept });
    }
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
                  {selectedStore ? selectedStore.name : selectedCompany ? selectedCompany.name : 'Store Configuration'}
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
                  <div className="text-sm text-slate-900 font-medium">
                    {selectedStore ? 'Store Configuration' : 'Location Manager'}
                  </div>
                  <div className="text-sm text-slate-600">
                    {selectedStore ? 'Configure settings and placements' : `${storesByCompany[selectedCompany?.id || 0]?.length || 0} locations`}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  {selectedStore ? 'Manage store settings and layouts' : 'View and manage store locations'}
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
        <StoreManagement onBack={() => setCurrentView('home')} />
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
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
              <span className="text-base font-semibold text-slate-700">Studio</span>
            </div>
          </div>
          <Suspense fallback={<div className="w-48 h-10 bg-slate-100 rounded-lg animate-pulse"></div>}>
            <HeaderNavigation
              userConceptId={user.concept_id}
              userCompanyId={user.company_id}
              userStoreId={user.store_id}
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
          <UserMenu role="operator" onBackToRoles={onBack} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCards.map(card => renderCard(card.id))}
        </div>
      </main>

      {showLocationSelector && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <LocationSelector
            onClose={() => setShowLocationSelector(false)}
            onSelect={(selectedLocation) => {
              if (selectedLocation.company) {
                setSelectedCompany(selectedLocation.company);
              }
              if (selectedLocation.store) {
                setSelectedStore(selectedLocation.store);
              }
              setShowLocationSelector(false);
            }}
            selectedLocation={{
              concept: location.concept,
              company: selectedCompany || undefined,
              store: selectedStore || undefined
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
