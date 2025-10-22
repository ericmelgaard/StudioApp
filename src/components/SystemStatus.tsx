import { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemStatusItem {
  id: string;
  service_name: string;
  status: 'operational' | 'degraded' | 'down';
  last_checked: string;
  message: string;
}

export default function SystemStatus() {
  const [statusItems, setStatusItems] = useState<SystemStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemStatus();

    const channel = supabase
      .channel('system_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_status',
        },
        () => {
          loadSystemStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSystemStatus = async () => {
    const { data, error } = await supabase
      .from('system_status')
      .select('*')
      .order('service_name');

    if (error) {
      console.error('Error loading system status:', error);
      setLoading(false);
      return;
    }

    setStatusItems(data || []);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'down':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Down';
      default:
        return 'Unknown';
    }
  };

  const overallStatus = statusItems.some(item => item.status === 'down')
    ? 'down'
    : statusItems.some(item => item.status === 'degraded')
    ? 'degraded'
    : 'operational';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-slate-400 animate-pulse" />
          <h2 className="text-lg font-semibold text-slate-900">System Status</h2>
        </div>
        <p className="text-slate-500">Loading system status...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">System Status</h2>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(overallStatus)}`}>
          {getStatusIcon(overallStatus)}
          <span className="text-sm font-medium">{getStatusText(overallStatus)}</span>
        </div>
      </div>

      {statusItems.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No system status data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {statusItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900">{item.service_name}</h3>
                  {item.message && (
                    <p className="text-sm text-slate-600 mt-0.5">{item.message}</p>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                  {getStatusText(item.status)}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(item.last_checked).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
