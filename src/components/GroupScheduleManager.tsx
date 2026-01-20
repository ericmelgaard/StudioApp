import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Trash2, Edit2, AlertCircle, Palette, X, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GroupScheduleManagerProps {
  groupId: string;
  groupName: string;
}

interface Schedule {
  id: string;
  daypart_definition_id: string;
  placement_group_id: string;
  days_of_week: number[];
  start_time: string;
  end_time?: string;
  runs_on_days?: boolean;
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
          .from('site_daypart_routines')
          .select('*, daypart_definitions(id, daypart_name, display_label, color, icon)')
          .eq('placement_group_id', groupId)
          .order('created_at', { ascending: false }),
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
        .from('site_daypart_routines')
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
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Loading schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative pb-24">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Placement Schedules
        </h3>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
          <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-sm px-4">No schedules created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => setEditingSchedule(schedule)}
              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-750 transition-colors text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {schedule.daypart_definitions?.display_label || 'Unknown Daypart'}
                    </span>
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
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Floating Action Buttons */}
      {!showCreateModal && !editingSchedule && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-14 h-14 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
            title="Add Schedule"
          >
            <Plus className="w-6 h-6" />
          </button>
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
          onDelete={editingSchedule ? handleDelete : undefined}
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
  onDelete?: (scheduleId: string) => Promise<void>;
}

function ScheduleFormModal({ schedule, groupId, dayparts, onClose, onSuccess, onDelete }: ScheduleFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<'regular' | 'event'>('regular');
  const [runsOnSelectedDays, setRunsOnSelectedDays] = useState(schedule?.runs_on_days !== false);
  const [formData, setFormData] = useState({
    daypart_definition_id: schedule?.daypart_definition_id || '',
    days_of_week: schedule?.days_of_week || [] as number[],
    start_time: schedule?.start_time || '06:00',
    end_time: schedule?.end_time || '11:00'
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

    if (!formData.daypart_definition_id) {
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
        daypart_definition_id: formData.daypart_definition_id,
        placement_group_id: groupId,
        days_of_week: formData.days_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        runs_on_days: runsOnSelectedDays
      };

      if (schedule?.id) {
        const { error } = await supabase
          .from('site_daypart_routines')
          .update(data)
          .eq('id', schedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_daypart_routines')
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

  const handleDeleteClick = async () => {
    if (!schedule?.id || !onDelete) return;

    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return;
    }

    try {
      await onDelete(schedule.id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center">
      <div className="bg-white dark:bg-slate-800 w-full h-full md:h-auto md:max-w-lg md:rounded-lg shadow-xl md:max-h-[90vh] flex flex-col">
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
                value={formData.daypart_definition_id}
                onChange={(e) => setFormData({ ...formData, daypart_definition_id: e.target.value })}
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
                        ? 'bg-cyan-600 text-white'
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

            <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg">
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
                  runsOnSelectedDays ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'
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

        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
          {schedule && onDelete ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
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
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 disabled:bg-slate-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
