import { useState, useEffect } from 'react';
import { X, Monitor, Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreateGroupModalProps {
  storeId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface AvailableDevice {
  id: string;
  name: string;
  display_type_id: string;
  position: number;
  status: string;
  media_player?: {
    id: string;
    name: string;
    device_id: string;
    ip_address: string | null;
    status: string;
  };
  display_types?: {
    name: string;
    category: string;
  };
}

export default function CreateGroupModal({ storeId, onClose, onSuccess }: CreateGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<AvailableDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadAvailableDevices();
  }, [storeId]);

  const loadAvailableDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data, error } = await supabase
        .from('displays')
        .select(`
          id,
          name,
          display_type_id,
          position,
          status,
          placement_group_id,
          media_player:media_players(id, name, device_id, ip_address, status, store_id),
          display_types(name, category)
        `)
        .eq('media_player.store_id', storeId)
        .is('placement_group_id', null)
        .order('name');

      if (error) throw error;

      setAvailableDevices(data || []);
    } catch (err) {
      console.error('Error loading available displays:', err);
      setError('Failed to load available displays');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDevices.length === availableDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(availableDevices.map(d => d.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedDevices.length === 0) {
      setError('Please select at least one display');
      return;
    }

    setLoading(true);

    try {
      const { data: newGroup, error: groupError } = await supabase
        .from('placement_groups')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          store_id: storeId,
          is_store_root: false
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const updatePromises = selectedDevices.map(deviceId =>
        supabase
          .from('displays')
          .update({ placement_group_id: newGroup.id })
          .eq('id', deviceId)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error('Failed to assign some devices to the group');
      }

      onSuccess();
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Placement Group</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Drive-Thru Displays, Front Counter"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                placeholder="Optional description for this group"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Select Devices ({selectedDevices.length} selected)
                </label>
                {availableDevices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                  >
                    {selectedDevices.length === availableDevices.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {loadingDevices ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Loading devices...</p>
                </div>
              ) : availableDevices.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Monitor className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No available devices. All devices are already assigned to groups.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  {availableDevices.map((device) => (
                    <label
                      key={device.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDevices.includes(device.id)
                          ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => handleDeviceToggle(device.id)}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Monitor className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {device.name}
                          </span>
                          {getStatusIcon(device.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>{device.device_id}</span>
                          {device.ip_address && (
                            <>
                              <span>•</span>
                              <span>{device.ip_address}</span>
                            </>
                          )}
                          {device.hardware_devices?.device_type && (
                            <>
                              <span>•</span>
                              <span>{device.hardware_devices.device_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedDevices.includes(device.id) && (
                        <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || selectedDevices.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
