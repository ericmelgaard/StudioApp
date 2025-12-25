import { useState, useEffect } from 'react';
import { Activity, Database, ArrowRight, CheckCircle, XCircle, Clock, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IntegrationDashboardProps {
  onNavigate: (page: 'access' | 'catalog') => void;
}

interface SyncHistory {
  id: string;
  source_name: string;
  status: 'success' | 'failed' | 'in_progress';
  items_synced: number;
  started_at: string;
  completed_at?: string;
}

interface SourceStats {
  total_sources: number;
  active_sources: number;
  total_products: number;
  last_sync: string;
}

export default function IntegrationDashboard({ onNavigate }: IntegrationDashboardProps) {
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [stats, setStats] = useState<SourceStats>({
    total_sources: 0,
    active_sources: 0,
    total_products: 0,
    last_sync: 'Never'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [sourcesResult, productsResult, historyResult] = await Promise.all([
      supabase.from('integration_sources').select('id, is_active'),
      supabase.from('integration_products').select('id', { count: 'exact', head: true }),
      supabase
        .from('integration_sync_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5)
    ]);

    if (sourcesResult.data) {
      const activeSources = sourcesResult.data.filter(s => s.is_active).length;
      setStats(prev => ({
        ...prev,
        total_sources: sourcesResult.data.length,
        active_sources: activeSources
      }));
    }

    if (productsResult.count !== null) {
      setStats(prev => ({ ...prev, total_products: productsResult.count || 0 }));
    }

    if (historyResult.data && historyResult.data.length > 0) {
      setSyncHistory(historyResult.data);
      const lastSync = new Date(historyResult.data[0].started_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / 60000);

      let timeAgo = 'Just now';
      if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diffMinutes > 0) {
        timeAgo = `${diffMinutes} min ago`;
      }

      setStats(prev => ({ ...prev, last_sync: timeAgo }));
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Integration Dashboard</h1>
          <p className="text-slate-600">Monitor your data integration sources and sync activity</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.total_sources}</div>
            <div className="text-sm text-slate-600">Total Sources</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-xs text-green-600 font-medium">Active</div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.active_sources}</div>
            <div className="text-sm text-slate-600">Active Sources</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.total_products.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Synced Products</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.last_sync}</div>
            <div className="text-sm text-slate-600">Last Sync</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => onNavigate('access')}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Access Management</h3>
            <p className="text-sm text-slate-600">Configure data sources and sync schedules</p>
          </button>

          <button
            onClick={() => onNavigate('catalog')}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Product Catalog</h3>
            <p className="text-sm text-slate-600">Map and import products from sources</p>
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Sync Activity</h3>
            <p className="text-sm text-slate-600">View detailed sync logs and history</p>
          </div>
        </div>

        {/* Recent Sync History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Recent Sync Activity</h2>
          </div>

          {syncHistory.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No sync activity yet</p>
              <p className="text-sm text-slate-400 mt-1">Connect a source to start syncing data</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {syncHistory.map(sync => (
                <div key={sync.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(sync.status)}
                      <div>
                        <div className="font-medium text-slate-900">{sync.source_name}</div>
                        <div className="text-sm text-slate-500">
                          Started {formatTime(sync.started_at)}
                          {sync.completed_at && ` • Completed ${formatTime(sync.completed_at)}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {sync.status === 'success' && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900">{sync.items_synced} items</div>
                          <div className="text-xs text-slate-500">synced</div>
                        </div>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sync.status)}`}>
                        {sync.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
