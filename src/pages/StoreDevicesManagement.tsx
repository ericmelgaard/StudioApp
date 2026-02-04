import { useState, useEffect } from 'react';
import {
  ArrowLeft, Monitor, Search, MoreVertical, Eye, Settings, Trash2,
  RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2, Radio,
  HardDrive, Network, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StoreDevicesManagementProps {
  storeId: number;
  storeName: string;
  onBack: () => void;
  filterPlayerType?: 'signage' | 'label';
  title?: string;
}

interface MediaPlayer {
  id: string;
  name: string;
  device_id: string;
  hardware_device_id: string | null;
  ip_address: string | null;
  mac_address: string | null;
  status: 'online' | 'offline' | 'error' | 'identify';
  last_heartbeat: string | null;
  firmware_version: string | null;
  placement_group_id: string | null;
  store_id: number;
  created_at: string;
  hardware_device?: {
    device_id: string;
    device_type: string;
    status: string;
    serial_number: string | null;
    activation_id?: string;
    client_version?: string;
  } | null;
  placement_group?: {
    id: string;
    name: string;
  } | null;
  display_count?: number;
}

export default function StoreDevicesManagement({ storeId, storeName, onBack, filterPlayerType, title }: StoreDevicesManagementProps) {
  const [devices, setDevices] = useState<MediaPlayer[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<MediaPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'error'>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, [storeId]);

  useEffect(() => {
    filterDevices();
  }, [searchQuery, statusFilter, devices]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_players')
        .select(`
          *,
          hardware_devices(device_id, device_type, status, serial_number, activation_id, client_version)
        `)
        .eq('store_id', storeId);

      if (filterPlayerType) {
        query = query.eq('player_type', filterPlayerType);
      }

      const { data: mediaPlayers, error: mpError } = await query.order('name');

      if (mpError) throw mpError;

      const { data: displays, error: displaysError } = await supabase
        .from('displays')
        .select('id, media_player_id, placement_group_id, placement_groups(id, name)')
        .in('media_player_id', mediaPlayers?.map(mp => mp.id) || []);

      if (displaysError) throw displaysError;

      const devicesWithCounts = mediaPlayers?.map(mp => ({
        ...mp,
        display_count: displays?.filter(d => d.media_player_id === mp.id).length || 0
      })) || [];

      setDevices(devicesWithCounts);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDevices = () => {
    let filtered = devices;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(device =>
        device.name.toLowerCase().includes(query) ||
        device.device_id.toLowerCase().includes(query) ||
        device.ip_address?.toLowerCase().includes(query) ||
        device.mac_address?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => device.status === statusFilter);
    }

    setFilteredDevices(filtered);
  };

  const calculateUptime = (lastHeartbeat: string | null): string => {
    if (!lastHeartbeat) return 'Never';

    const now = new Date();
    const last = new Date(lastHeartbeat);
    const diff = Math.floor((now.getTime() - last.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-5 h-5 text-slate-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'identify':
        return <Radio className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Monitor className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-slate-400';
      case 'error':
        return 'bg-red-500';
      case 'identify':
        return 'bg-blue-500 animate-pulse';
      default:
        return 'bg-slate-400';
    }
  };

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    error: devices.filter(d => d.status === 'error').length
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title || 'Devices'}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{storeName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Online</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.online}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <WifiOff className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Offline</span>
            </div>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.offline}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Errors</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-500">{stats.error}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'offline' | 'error')}
            className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="error">Error</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading devices...</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Monitor className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No devices found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      {getStatusIcon(device.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {device.name}
                        </h3>
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}></span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        {device.device_id}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {device.hardware_device && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 rounded">
                            <HardDrive className="w-3 h-3" />
                            {device.hardware_device.device_type}
                          </span>
                        )}
                        {device.hardware_device?.activation_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-xs font-mono text-emerald-700 dark:text-emerald-400 rounded">
                            {device.hardware_device.activation_id}
                          </span>
                        )}
                        {device.placement_group && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-xs text-blue-700 dark:text-blue-400 rounded">
                            {device.placement_group.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === device.id ? null : device.id)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      aria-label="Device actions"
                    >
                      <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    {activeMenu === device.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-10">
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Radio className="w-4 h-4" />
                          Identify
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          Restart
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Edit
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
