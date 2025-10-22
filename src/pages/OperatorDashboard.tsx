import { useState, useEffect } from 'react';
import { Settings, ArrowLeft, Monitor, Tag, ArrowRight, TrendingUp, Store, Package, Menu, X } from 'lucide-react';
import NotificationPanel from '../components/NotificationPanel';
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

export default function OperatorDashboard({ onBack }: OperatorDashboardProps) {
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Full Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-white border-r border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              <button
                onClick={() => {
                  setCurrentView('signage');
                  setSidebarOpen(false);
                }}
                className="w-full group bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-green-300 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                    <Monitor className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Digital Signage
                    </h3>
                    <p className="text-sm text-slate-600">
                      Configure displays and update content
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs mt-3 ml-14">
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-900">{stats.signageCount}</span> displays
                  </span>
                  <span className="text-slate-500">
                    <span className="font-semibold text-green-600">{stats.signageOnline}</span> online
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setCurrentView('labels');
                  setSidebarOpen(false);
                }}
                className="w-full group bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <Tag className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Shelf Labels
                    </h3>
                    <p className="text-sm text-slate-600">
                      Update pricing and sync product info
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs mt-3 ml-14">
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-900">{stats.labelsCount}</span> labels
                  </span>
                  <span className="text-slate-500">
                    <span className="font-semibold text-blue-600">{stats.labelsSynced}</span> synced
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setCurrentView('store');
                  setSidebarOpen(false);
                }}
                className="w-full group bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-amber-300 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Store Management
                    </h3>
                    <p className="text-sm text-slate-600">
                      Configure placement groups and templates
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setCurrentView('products');
                  setSidebarOpen(false);
                }}
                className="w-full group bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-purple-300 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Products
                    </h3>
                    <p className="text-sm text-slate-600">
                      Sync menu items and manage catalog
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs mt-3 ml-14">
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-900">{stats.productsCount}</span> products
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Menu"
              >
                <Menu className="w-6 h-6 text-slate-600" />
              </button>
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Operator Dashboard</h1>
                <p className="text-xs text-slate-500">Demo Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationPanel />
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Roles
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Operations Control Center
          </h2>
          <p className="text-slate-600">
            Monitor your digital signage and electronic shelf labels
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Monitor className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-70" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Digital Signage</h3>
            <p className="text-3xl font-bold mb-1">{stats.signageCount}</p>
            <p className="text-sm opacity-80">{stats.signageOnline} online</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Tag className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-70" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Shelf Labels</h3>
            <p className="text-3xl font-bold mb-1">{stats.labelsCount}</p>
            <p className="text-sm opacity-80">{stats.labelsSynced} synced</p>
          </div>

          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Settings className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-70" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">System Health</h3>
            <p className="text-3xl font-bold mb-1">98%</p>
            <p className="text-sm opacity-80">All systems operational</p>
          </div>
        </div>

        <div className="mb-8">
          <SystemStatus />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">What would you like to do?</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => setCurrentView('signage')}
            className="group bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-lg hover:border-green-300 transition-all text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Manage Digital Signage
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Configure displays, update content, and monitor the status of your digital signage across all locations
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">
                <span className="font-semibold text-slate-900">{stats.signageCount}</span> displays
              </span>
              <span className="text-slate-500">
                <span className="font-semibold text-green-600">{stats.signageOnline}</span> online
              </span>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('labels')}
            className="group bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-lg hover:border-green-300 transition-all text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                <Tag className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Manage Shelf Labels
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Update pricing, sync product information, and manage electronic shelf labels throughout your store
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">
                <span className="font-semibold text-slate-900">{stats.labelsCount}</span> labels
              </span>
              <span className="text-slate-500">
                <span className="font-semibold text-blue-600">{stats.labelsSynced}</span> synced
              </span>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('store')}
            className="group bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-lg hover:border-green-300 transition-all text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                <Store className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Manage Store
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Configure placement groups, dayparts, meal stations, and templates for your store locations
            </p>
          </button>

          <button
            onClick={() => setCurrentView('products')}
            className="group bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-lg hover:border-green-300 transition-all text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                <Package className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Manage Products
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Sync menu items from your POS system and manage product catalog for displays and labels
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">
                <span className="font-semibold text-slate-900">{stats.productsCount}</span> products
              </span>
            </div>
          </button>
        </div>
      </main>
      </div>
    </div>
  );
}
