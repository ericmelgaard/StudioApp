import { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IntegrationSource {
  id: string;
  name: string;
  last_sync_at: string;
  last_successful_sync_at: string;
  sync_status: string;
  sync_frequency: string;
  total_syncs: number;
  failed_syncs: number;
}

interface SyncHistory {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  records_added: number;
  records_updated: number;
  records_deleted: number;
  total_records: number;
  error_message: string;
  metadata: any;
}

export default function IntegrationStatus() {
  const [source, setSource] = useState<IntegrationSource | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: sourceData } = await supabase
      .from('integration_sources')
      .select('*')
      .maybeSingle();

    const { data: historyData } = await supabase
      .from('integration_sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (sourceData) setSource(sourceData);
    if (historyData) setSyncHistory(historyData);

    setLoading(false);
  }

  async function handleForceSync() {
    if (!source) return;

    setSyncing(true);

    const startedAt = new Date().toISOString();
    const { data: newSync } = await supabase
      .from('integration_sync_history')
      .insert({
        source_id: source.id,
        sync_type: 'manual',
        status: 'in_progress',
        started_at: startedAt,
      })
      .select()
      .single();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const completedAt = new Date().toISOString();
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    const recordsAdded = Math.floor(Math.random() * 5);
    const recordsUpdated = Math.floor(Math.random() * 30) + 10;
    const recordsDeleted = Math.floor(Math.random() * 3);

    if (newSync) {
      await supabase
        .from('integration_sync_history')
        .update({
          status: 'success',
          completed_at: completedAt,
          duration_ms: duration,
          records_added: recordsAdded,
          records_updated: recordsUpdated,
          records_deleted: recordsDeleted,
          total_records: 841,
          metadata: {
            products: Math.floor(recordsUpdated * 0.4),
            modifiers: Math.floor(recordsUpdated * 0.5),
            discounts: Math.floor(recordsUpdated * 0.1),
          },
        })
        .eq('id', newSync.id);

      await supabase
        .from('integration_sources')
        .update({
          last_sync_at: completedAt,
          last_successful_sync_at: completedAt,
          total_syncs: (source.total_syncs || 0) + 1,
        })
        .eq('id', source.id);
    }

    setSyncing(false);
    loadData();
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-600">No integration source found</p>
      </div>
    );
  }

  const successRate =
    source.total_syncs > 0
      ? ((source.total_syncs - source.failed_syncs) / source.total_syncs) * 100
      : 100;

  const latestSync = syncHistory[0];
  const totalChanges = latestSync
    ? latestSync.records_added + latestSync.records_updated + latestSync.records_deleted
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-600">Sync Health</div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold text-slate-900">{successRate.toFixed(1)}%</div>
            <div className="text-xs text-green-600 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Success rate
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-600">Total Syncs</div>
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold text-slate-900">{source.total_syncs}</div>
            <div className="text-xs text-slate-500 mb-1">
              {source.failed_syncs} failed
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-600">Last Sync</div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {source.last_sync_at ? formatDate(source.last_sync_at) : 'Never'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-600">Latest Changes</div>
            <Edit3 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalChanges}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Integration Status</h3>
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              syncing
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Force Sync'}
          </button>
        </div>

        <div className="p-4">
          {latestSync && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      latestSync.status
                    )}`}
                  >
                    {getStatusIcon(latestSync.status)}
                    {latestSync.status === 'success' ? 'Successful' : latestSync.status === 'failed' ? 'Failed' : 'In Progress'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {latestSync.sync_type === 'manual' ? 'Manual Sync' : 'Scheduled Sync'}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDate(latestSync.started_at)}
                </span>
              </div>

              {latestSync.status === 'success' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded">
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {latestSync.records_added}
                      </div>
                      <div className="text-xs text-slate-500">Added</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {latestSync.records_updated}
                      </div>
                      <div className="text-xs text-slate-500">Updated</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded">
                      <Trash2 className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {latestSync.records_deleted}
                      </div>
                      <div className="text-xs text-slate-500">Deleted</div>
                    </div>
                  </div>
                </div>
              )}

              {latestSync.status === 'failed' && latestSync.error_message && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-red-900 mb-1">Sync Failed</div>
                    <div className="text-red-700">{latestSync.error_message}</div>
                  </div>
                </div>
              )}

              {latestSync.duration_ms && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-500">
                  <div>Duration: {formatDuration(latestSync.duration_ms)}</div>
                  <div>Total Records: {latestSync.total_records}</div>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Recent Sync History</h4>
            <div className="space-y-2">
              {syncHistory.slice(0, 8).map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        sync.status
                      )}`}
                    >
                      {getStatusIcon(sync.status)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-slate-900">
                        {sync.sync_type === 'manual' ? 'Manual' : 'Scheduled'} Sync
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(sync.started_at)}
                      </div>
                    </div>
                    {sync.status === 'success' && (
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Plus className="w-3 h-3 text-green-600" />
                          {sync.records_added}
                        </span>
                        <span className="flex items-center gap-1">
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          {sync.records_updated}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trash2 className="w-3 h-3 text-slate-500" />
                          {sync.records_deleted}
                        </span>
                      </div>
                    )}
                    {sync.duration_ms && (
                      <div className="text-xs text-slate-500">
                        {formatDuration(sync.duration_ms)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
