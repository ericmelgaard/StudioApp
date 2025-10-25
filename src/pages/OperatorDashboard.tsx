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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Operations Overview
          </h2>
          <p className="text-slate-600">
            Monitor and manage your digital systems
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 px-6 py-4">
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium shadow-sm border border-slate-200">
                  All systems
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            <button
              onClick={() => setCurrentView('signage')}
              className="w-full px-6 py-5 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                  <Monitor className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      Digital signage
                    </h3>
                    <span className="text-2xl font-bold text-slate-900">
                      {stats.signageCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${stats.signageCount > 0 ? (stats.signageOnline / stats.signageCount) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600">
                        {stats.signageCount > 0 ? Math.round((stats.signageOnline / stats.signageCount) * 100) : 0}%
                      </span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {stats.signageOnline} online
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>

            <button
              onClick={() => setCurrentView('labels')}
              className="w-full px-6 py-5 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Tag className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      Shelf labels
                    </h3>
                    <span className="text-2xl font-bold text-slate-900">
                      {stats.labelsCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${stats.labelsCount > 0 ? (stats.labelsSynced / stats.labelsCount) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600">
                        {stats.labelsCount > 0 ? Math.round((stats.labelsSynced / stats.labelsCount) * 100) : 0}%
                      </span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {stats.labelsSynced} synced
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>

            <button
              onClick={() => setCurrentView('products')}
              className="w-full px-6 py-5 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      Products
                    </h3>
                    <span className="text-2xl font-bold text-slate-900">
                      {stats.productsCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-slate-600">
                      Manage product catalog
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              onClick={() => setCurrentView('store')}
              className="flex items-center gap-3 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors group"
            >
              <Store className="w-4 h-4" />
              <span>Store configuration</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <SystemStatus />
        </div>
      </main>
    </div>
  );
}
