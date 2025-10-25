import { useState, useEffect } from 'react';
import { Settings, Monitor, Tag, ArrowRight, TrendingUp, Store, Package, ChevronDown, HelpCircle, FileText } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';
import SystemStatus from '../components/SystemStatus';
import SignageManagement from './SignageManagement';
import ShelfLabelManagement from './ShelfLabelManagement';
import StoreManagement from './StoreManagement';
import ProductManagement from './ProductManagement';
import { supabase } from '../lib/supabase';

type DashboardView = 'home' | 'signage' | 'labels' | 'store' | 'products';

interface OperatorDashboardProps {
  onBack: () => void;
}

const STORE_LOCATIONS = [
  'Admiral Food Market - Portland, OR',
  'Admiral Food Market - Seattle, WA',
  'Admiral Food Market - San Francisco, CA',
  'Admiral Food Market - Los Angeles, CA',
  'Admiral Food Market - San Diego, CA',
  'Admiral Food Market - Denver, CO',
];

export default function OperatorDashboard({ onBack }: OperatorDashboardProps) {
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const [selectedStore, setSelectedStore] = useState(STORE_LOCATIONS[0]);
  const [stats, setStats] = useState({
    signageCount: 0,
    signageOnline: 0,
    labelsCount: 0,
    labelsSynced: 0,
    productsCount: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [signageResult, labelsResult, productsResult] = await Promise.all([
      supabase.from('digital_signage').select('status', { count: 'exact' }),
      supabase.from('shelf_labels').select('status', { count: 'exact' }),
      supabase.from('products').select('id', { count: 'exact' }),
    ]);

    const signageCount = signageResult.count || 0;
    const signageOnline = signageResult.data?.filter(s => s.status === 'online').length || 0;
    const labelsCount = labelsResult.count || 0;
    const labelsSynced = labelsResult.data?.filter(l => l.status === 'synced').length || 0;
    const productsCount = productsResult.count || 0;

    setStats({
      signageCount,
      signageOnline,
      labelsCount,
      labelsSynced,
      productsCount,
    });
  };

  if (currentView === 'signage') {
    return <SignageManagement onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'labels') {
    return <ShelfLabelManagement onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'store') {
    return <StoreManagement onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'products') {
    return <ProductManagement onBack={() => setCurrentView('home')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">WAND Digital</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-base font-semibold text-slate-700">Studio</span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                  <Store className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-900 max-w-xs truncate">
                    {selectedStore}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {STORE_LOCATIONS.map((location) => (
                    <button
                      key={location}
                      onClick={() => setSelectedStore(location)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                        selectedStore === location ? 'bg-green-50 text-green-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => setCurrentView('signage')}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <h3 className="text-sm font-semibold text-slate-900 ml-2">
                  Digital Signage
                </h3>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Monitor className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.signageCount}</div>
                  <div className="text-sm text-slate-600">Total displays</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Online</span>
                  <span className="text-sm font-semibold text-green-600">{stats.signageOnline}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${stats.signageCount > 0 ? (stats.signageOnline / stats.signageCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('labels')}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <h3 className="text-sm font-semibold text-slate-900 ml-2">
                  Shelf Labels
                </h3>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Tag className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.labelsCount}</div>
                  <div className="text-sm text-slate-600">Total labels</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Synced</span>
                  <span className="text-sm font-semibold text-blue-600">{stats.labelsSynced}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${stats.labelsCount > 0 ? (stats.labelsSynced / stats.labelsCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('products')}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <h3 className="text-sm font-semibold text-slate-900 ml-2">
                  Products
                </h3>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
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
          </button>

          <button
            onClick={() => setCurrentView('store')}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <h3 className="text-sm font-semibold text-slate-900 ml-2">
                  Store Configuration
                </h3>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
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
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <h3 className="text-sm font-semibold text-slate-900 ml-2">
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

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <h3 className="text-sm font-semibold text-slate-900 ml-2">
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
        </div>
      </main>
    </div>
  );
}
