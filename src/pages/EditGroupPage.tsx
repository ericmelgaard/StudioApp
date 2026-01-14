import { useState, useEffect } from 'react';
import {
  ArrowLeft, AlertCircle, CheckCircle2, Wifi, WifiOff, Monitor,
  Calendar, ChevronRight, Palette, Save, Flame, Pizza, Coffee,
  Zap, Wrench, Utensils, DoorOpen, Sunrise, IceCream, Wine
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditGroupPageProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    templates?: any;
  };
  storeId: number;
  onBack: () => void;
  onNavigateToSchedules: () => void;
  onNavigateToDevices: () => void;
}

interface Theme {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  status: string;
}

interface Device {
  id: string;
  name: string;
  device_id: string;
  status: 'online' | 'offline' | 'error';
}

interface Schedule {
  id: string;
  theme_id: string;
  start_time: string;
  days_of_week: number[];
}

const getIconComponent = (iconName: string | null) => {
  const iconMap: { [key: string]: any } = {
    flame: Flame,
    pizza: Pizza,
    coffee: Coffee,
    zap: Zap,
    wrench: Wrench,
    utensils: Utensils,
    'utensils-crossed': Utensils,
    'door-open': DoorOpen,
    sunrise: Sunrise,
    'ice-cream': IceCream,
    wine: Wine,
    taco: Utensils,
    italian: Pizza
  };
  return iconMap[iconName || ''] || Palette;
};

export default function EditGroupPage({
  group,
  storeId,
  onBack,
  onNavigateToSchedules,
  onNavigateToDevices
}: EditGroupPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || ''
  });

  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(group.templates?.theme_id || null);
  const [loadingThemes, setLoadingThemes] = useState(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  useEffect(() => {
    loadThemes();
    loadDevices();
    loadSchedules();
  }, [group.id, storeId]);

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

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data, error } = await supabase
        .from('media_players')
        .select('id, name, device_id, status')
        .eq('store_id', storeId)
        .eq('placement_group_id', group.id)
        .order('name')
        .limit(4);

      if (error) throw error;
      setDevices(data || []);
    } catch (err) {
      console.error('Error loading devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const { data, error } = await supabase
        .from('placement_routines')
        .select('id, theme_id, start_time, days_of_week')
        .eq('placement_id', group.id)
        .order('start_time')
        .limit(3);

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoadingSchedules(false);
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

      setSuccess('Group info updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating group:', err);
      setError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('placement_groups')
        .update({
          templates: {
            ...group.templates,
            theme_id: themeId
          }
        })
        .eq('id', group.id);

      if (error) throw error;

      setSuccess('Theme updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating theme:', err);
      setError('Failed to update theme');
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

  const formatDays = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.sort((a, b) => a - b).map(d => dayNames[d]).join(', ');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{group.name}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Edit Group</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto pb-20">
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Group Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
              <button
                onClick={handleUpdateInfo}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Theme</h2>
              {selectedTheme && (
                <button
                  onClick={() => handleUpdateTheme('')}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Clear
                </button>
              )}
            </div>

            {loadingThemes ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : themes.length === 0 ? (
              <div className="text-center py-8 mx-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <Palette className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No themes available</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-0 border-t border-slate-200 dark:border-slate-700">
                {themes.map((theme) => {
                  const IconComponent = getIconComponent(theme.icon);
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleUpdateTheme(theme.id)}
                      className={`flex flex-col items-center gap-1 p-3 transition-all border-r border-b border-slate-200 dark:border-slate-700 ${
                        selectedTheme === theme.id
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                        selectedTheme === theme.id
                          ? 'bg-blue-500'
                          : 'bg-slate-100 dark:bg-slate-700'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          selectedTheme === theme.id
                            ? 'text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`} />
                      </div>
                      <span className={`text-[10px] font-medium text-center line-clamp-1 ${
                        selectedTheme === theme.id
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {theme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Schedules</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Manage theme rotation schedules</p>
              </div>
            </div>

            {loadingSchedules ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No schedules created yet</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatDays(schedule.days_of_week)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Starts at {schedule.start_time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {schedules.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                    Showing {schedules.length} most recent
                  </p>
                )}
              </div>
            )}

            <button
              onClick={onNavigateToSchedules}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Manage Schedules
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Devices</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Media players assigned to this group</p>
              </div>
            </div>

            {loadingDevices ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                <Monitor className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No devices assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{device.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{device.device_id}</p>
                      </div>
                    </div>
                    {getStatusIcon(device.status)}
                  </div>
                ))}
                {devices.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                    Showing {devices.length} devices
                  </p>
                )}
              </div>
            )}

            <button
              onClick={onNavigateToDevices}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Manage Devices
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
