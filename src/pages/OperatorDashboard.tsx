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
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Monitor className="w-4 h-4 text-slate-400" />
                  </button>
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
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Tag className="w-4 h-4 text-slate-400" />
                  </button>
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
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Package className="w-4 h-4 text-slate-400" />
                  </button>
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
    </div>
  );
}
