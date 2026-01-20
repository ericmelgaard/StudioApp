import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Trash2, Edit2, AlertCircle, Palette, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GroupScheduleManagerProps {
  groupId: string;
  groupName: string;
}

interface Schedule {
  id: string;
  theme_id: string;
  cycle_week: number;
  days_of_week: number[];
  start_time: string;
  end_time?: string;
  schedule_name?: string;
  status: string;
  priority: number;
  themes?: {
    id: string;
    name: string;
    icon: string | null;
    icon_url: string | null;
  };
}

interface Theme {
  id: string;
  name: string;
  icon: string | null;
  icon_url: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' }
];

export default function GroupScheduleManager({ groupId, groupName }: GroupScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedulesResult, themesResult] = await Promise.all([
        supabase
          .from('placement_routines')
          .select('*, themes(id, name, icon, icon_url)')
          .eq('placement_id', groupId)
          .order('priority', { ascending: false }),
        supabase
          .from('themes')
          .select('id, name, icon, icon_url')
          .eq('status', 'active')
          .order('name')
      ]);

      if (schedulesResult.error) throw schedulesResult.error;
      if (themesResult.error) throw themesResult.error;

      setSchedules(schedulesResult.data || []);
      setThemes(themesResult.data || []);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const { error } = await supabase
        .from('placement_routines')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days
      .sort((a, b) => a - b)
      .map(d => DAYS_OF_WEEK[d].label)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Loading schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Placement Schedules
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">No schedules created yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {schedule.schedule_name && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {schedule.schedule_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-500" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {schedule.themes?.name || 'Unknown Theme'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSchedule(schedule)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Edit schedule"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete schedule"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDays(schedule.days_of_week)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {schedule.end_time
                      ? `${schedule.start_time} - ${schedule.end_time}`
                      : `Starts at ${schedule.start_time}`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded">
                    Week {schedule.cycle_week}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    schedule.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {schedule.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingSchedule) && (
        <ScheduleFormModal
          schedule={editingSchedule}
          groupId={groupId}
          themes={themes}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSchedule(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingSchedule(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface ScheduleFormModalProps {
  schedule: Schedule | null;
  groupId: string;
  themes: Theme[];
  onClose: () => void;
  onSuccess: () => void;
}

function ScheduleFormModal({ schedule, groupId, themes, onClose, onSuccess }: ScheduleFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    theme_id: schedule?.theme_id || '',
    cycle_week: schedule?.cycle_week || 1,
    days_of_week: schedule?.days_of_week || [] as number[],
    start_time: schedule?.start_time || '06:00',
    end_time: schedule?.end_time || '',
    schedule_name: schedule?.schedule_name || '',
    status: schedule?.status || 'active'
  });

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.theme_id) {
      setError('Please select a theme');
      return;
    }

    if (formData.days_of_week.length === 0) {
      setError('Please select at least one day');
      return;
    }

    setLoading(true);

    try {
      const data = {
        theme_id: formData.theme_id,
        placement_id: groupId,
        cycle_week: formData.cycle_week,
        days_of_week: formData.days_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        schedule_name: formData.schedule_name || null,
        status: formData.status
      };

      if (schedule?.id) {
        const { error } = await supabase
          .from('placement_routines')
          .update(data)
          .eq('id', schedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('placement_routines')
          .insert(data);

        if (error) throw error;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center">
      <div className="bg-white dark:bg-slate-800 w-full md:max-w-lg md:rounded-lg rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {schedule ? 'Edit Schedule' : 'Create Schedule'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Schedule Name (optional)
            </label>
            <input
              type="text"
              value={formData.schedule_name}
              onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
              placeholder="e.g., Weekend Breakfast, Summer Hours"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Theme *
            </label>
            <select
              value={formData.theme_id}
              onChange={(e) => setFormData({ ...formData, theme_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="">Select a theme</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Days of Week *
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    formData.days_of_week.includes(day.value)
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Cycle Week *
              </label>
              <input
                type="number"
                min="1"
                value={formData.cycle_week}
                onChange={(e) => setFormData({ ...formData, cycle_week: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
