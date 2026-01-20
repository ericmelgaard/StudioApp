import { useState, useEffect } from 'react';
import {
  X, Monitor, Palette, Calendar, Settings, AlertCircle, CheckCircle2,
  Wifi, WifiOff, Plus, Trash2, ImageOff, Edit2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import GroupScheduleManager from './GroupScheduleManager';

interface EditGroupModalProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    templates?: any;
  };
  storeId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Device {
  id: string;
  name: string;
  display_type_id: string;
  position: number;
  status: string;
  placement_group_id: string | null;
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

interface Theme {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  status: string;
}

type TabView = 'info' | 'devices' | 'theme' | 'schedules';

export default function EditGroupModal({ group, storeId, onClose, onSuccess }: EditGroupModalProps) {
  const [activeTab, setActiveTab] = useState<TabView>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || ''
  });

  const [currentDevices, setCurrentDevices] = useState<Device[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(group.templates?.theme_id || null);
  const [loadingThemes, setLoadingThemes] = useState(false);

  useEffect(() => {
    loadDevices();
    loadThemes();
  }, [group.id, storeId]);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data: allDevices, error } = await supabase
        .from('displays')
        .select(`
          id,
          name,
          display_type_id,
          position,
          status,
          placement_group_id,
          media_player:media_players(id, name, device_id, ip_address, status),
          display_types(name, category)
        `)
        .eq('media_player.store_id', storeId)
        .order('name');

      if (error) throw error;

      const current = allDevices?.filter(d => d.placement_group_id === group.id) || [];
      const available = allDevices?.filter(d => !d.placement_group_id) || [];

      setCurrentDevices(current);
      setAvailableDevices(available);
    } catch (err) {
      console.error('Error loading displays:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadThemes = async () => {
    setLoadingThemes(true);
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('id, name, description, icon, icon_url, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setThemes(data || []);
    } catch (err) {
      console.error('Error loading themes:', err);
    } finally {
      setLoadingThemes(false);
    }
  };

  const handleUpdateInfo = async () => {
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('placement_groups')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null
        })
        .eq('id', group.id);

      if (error) throw error;

      setSuccess('Group info updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating group:', err);
      setError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('displays')
        .update({ placement_group_id: group.id })
        .eq('id', deviceId);

      if (error) throw error;

      await loadDevices();
      setSuccess('Display added to group');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding display:', err);
      setError('Failed to add display');
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('displays')
        .update({ placement_group_id: null })
        .eq('id', deviceId);

      if (error) throw error;

      await loadDevices();
      setSuccess('Display removed from group');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing display:', err);
      setError('Failed to remove display');
    }
  };

  const handleUpdateTheme = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('placement_groups')
        .update({
          templates: {
            ...group.templates,
            theme_id: selectedTheme
          }
        })
        .eq('id', group.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating theme:', err);
      setError('Failed to update theme');
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Edit Group: {group.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
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

        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors flex-shrink-0 ${
              activeTab === 'info'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Info
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors flex-shrink-0 ${
              activeTab === 'devices'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Devices ({currentDevices.length})
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors flex-shrink-0 ${
              activeTab === 'theme'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Palette className="w-4 h-4" />
            Theme
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors flex-shrink-0 ${
              activeTab === 'schedules'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Schedules
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  rows={3}
                />
              </div>
              <button
                onClick={handleUpdateInfo}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Assigned Devices ({currentDevices.length})
                </h3>
                {loadingDevices ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
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
              </div>

              {availableDevices.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Available Devices ({availableDevices.length})
                  </h3>
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
                </div>
              )}
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTheme && themes.find(t => t.id === selectedTheme)
                      ? `Theme: ${themes.find(t => t.id === selectedTheme)?.name}`
                      : 'Select Theme'}
                  </h3>
                </div>
              </div>

              {loadingThemes ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              ) : themes.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Palette className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No themes available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
                      className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        selectedTheme === theme.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700'
                      }`}
                    >
                      <div className="w-16 h-16 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0">
                        {theme.icon_url ? (
                          <img
                            src={theme.icon_url}
                            alt={theme.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : theme.icon ? (
                          <Palette className="w-8 h-8 text-purple-500" />
                        ) : (
                          <ImageOff className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-center line-clamp-2 max-w-full leading-tight">
                        {theme.name}
                      </span>
                      {selectedTheme === theme.id && (
                        <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleUpdateTheme}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Theme'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'schedules' && (
            <GroupScheduleManager groupId={group.id} groupName={group.name} />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onSuccess}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
