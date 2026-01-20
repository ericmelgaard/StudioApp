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
  daypart_definitions?: {
    id: string;
    daypart_name: string;
    display_label: string;
    color: string;
    icon: string | null;
  };
}

interface Daypart {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'S', fullLabel: 'Sunday' },
  { value: 1, label: 'M', fullLabel: 'Monday' },
  { value: 2, label: 'T', fullLabel: 'Tuesday' },
  { value: 3, label: 'W', fullLabel: 'Wednesday' },
  { value: 4, label: 'T', fullLabel: 'Thursday' },
  { value: 5, label: 'F', fullLabel: 'Friday' },
  { value: 6, label: 'S', fullLabel: 'Saturday' }
];

export default function GroupScheduleManager({ groupId, groupName }: GroupScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dayparts, setDayparts] = useState<Daypart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const groupResult = await supabase
        .from('placement_groups')
        .select('store_id')
        .eq('id', groupId)
        .maybeSingle();

      if (groupResult.error) throw groupResult.error;

      const storeId = groupResult.data?.store_id;

      const [schedulesResult, daypartsResult] = await Promise.all([
        supabase
          .from('placement_routines')
          .select('*, daypart_definitions(id, daypart_name, display_label, color, icon)')
          .eq('placement_id', groupId)
          .order('priority', { ascending: false }),
        storeId
          ? supabase.rpc('get_effective_daypart_definitions', { p_store_id: storeId })
          : supabase
              .from('daypart_definitions')
              .select('id, daypart_name, display_label, color, icon')
              .is('concept_id', null)
              .is('store_id', null)
              .eq('is_active', true)
              .order('sort_order')
      ]);

      if (schedulesResult.error) throw schedulesResult.error;
      if (daypartsResult.error) throw daypartsResult.error;

      setSchedules(schedulesResult.data || []);
      setDayparts(daypartsResult.data || []);
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
                      {schedule.daypart_definitions?.display_label || 'Unknown Daypart'}
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
          dayparts={dayparts}
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
  dayparts: Daypart[];
  onClose: () => void;
  onSuccess: () => void;
}

function ScheduleFormModal({ schedule, groupId, dayparts, onClose, onSuccess }: ScheduleFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<'regular' | 'event'>('regular');
  const [runsOnSelectedDays, setRunsOnSelectedDays] = useState(true);
  const [formData, setFormData] = useState({
    theme_id: schedule?.theme_id || '',
    cycle_week: schedule?.cycle_week || 1,
    days_of_week: schedule?.days_of_week || [] as number[],
    start_time: schedule?.start_time || '06:00',
    end_time: schedule?.end_time || '11:00',
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
      setError('Please select a daypart');
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 p-3 mx-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setScheduleType('regular')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                scheduleType === 'regular'
                  ? 'bg-slate-700 dark:bg-slate-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Regular Schedule
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('event')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                scheduleType === 'event'
                  ? 'bg-slate-700 dark:bg-slate-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Event / Holiday
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Daypart Type *
              </label>
              <select
                value={formData.theme_id}
                onChange={(e) => setFormData({ ...formData, theme_id: e.target.value })}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a daypart...</option>
                {dayparts.map((daypart) => (
                  <option key={daypart.id} value={daypart.id}>
                    {daypart.display_label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Days of the Week *
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`h-12 rounded-lg font-medium text-sm transition-all ${
                      formData.days_of_week.includes(day.value)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Schedule Name (optional)
              </label>
              <input
                type="text"
                value={formData.schedule_name}
                onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                placeholder="e.g., Weekend Hours, Summer Schedule"
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Schedule runs on selected days
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Turn off for days where this schedule does not activate
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRunsOnSelectedDays(!runsOnSelectedDays)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  runsOnSelectedDays ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    runsOnSelectedDays ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Clock className="w-4 h-4" />
                  Start Time *
                </label>
                <input
                  type="text"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  placeholder="6:00 AM"
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Clock className="w-4 h-4" />
                  End Time *
                </label>
                <input
                  type="text"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  placeholder="11:00 AM"
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
