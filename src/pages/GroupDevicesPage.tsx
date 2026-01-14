import { useState, useEffect } from 'react';
import {
  ArrowLeft, Monitor, Plus, Trash2, AlertCircle, CheckCircle2,
  Wifi, WifiOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GroupDevicesPageProps {
  group: {
    id: string;
    name: string;
  };
  storeId: number;
  onBack: () => void;
}

interface Device {
  id: string;
  name: string;
  device_id: string;
  ip_address: string | null;
  status: 'online' | 'offline' | 'error';
  placement_group_id: string | null;
}

export default function GroupDevicesPage({ group, storeId, onBack }: GroupDevicesPageProps) {
  const [currentDevices, setCurrentDevices] = useState<Device[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, [group.id, storeId]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const { data: allDevices, error } = await supabase
        .from('media_players')
        .select('id, name, device_id, ip_address, status, placement_group_id')
        .eq('store_id', storeId)
        .order('name');

      if (error) throw error;

      const current = allDevices?.filter(d => d.placement_group_id === group.id) || [];
      const available = allDevices?.filter(d => !d.placement_group_id) || [];

      setCurrentDevices(current);
      setAvailableDevices(available);
    } catch (err) {
      console.error('Error loading devices:', err);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (deviceId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('media_players')
        .update({ placement_group_id: group.id })
        .eq('id', deviceId);

      if (error) throw error;

      await loadDevices();
      setSuccess('Device added to group');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding device:', err);
      setError('Failed to add device');
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('media_players')
        .update({ placement_group_id: null })
        .eq('id', deviceId);

      if (error) throw error;

      await loadDevices();
      setSuccess('Device removed from group');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing device:', err);
      setError('Failed to remove device');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Devices</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{group.name}</p>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className="p-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-6">
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Assigned Devices ({currentDevices.length})
          </h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : currentDevices.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <Monitor className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">No devices assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Monitor className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{device.name}</span>
                        {getStatusIcon(device.status)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {device.device_id}
                        {device.ip_address && ` • ${device.ip_address}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDevice(device.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove from group"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {availableDevices.length > 0 && (
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Available Devices ({availableDevices.length})
            </h2>
            <div className="space-y-2">
              {availableDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Monitor className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{device.name}</span>
                        {getStatusIcon(device.status)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {device.device_id}
                        {device.ip_address && ` • ${device.ip_address}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddDevice(device.id)}
                    className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Add to group"
                  >
                    <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
