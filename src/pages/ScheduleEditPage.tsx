import { useState } from 'react';
import { ArrowLeft, Clock, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Schedule {
  id: string;
  daypart_definition_id: string;
  placement_group_id: string;
  days_of_week: number[];
  start_time: string;
  end_time?: string;
  runs_on_days?: boolean;
  schedule_name?: string;
}

interface Daypart {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string | null;
}

interface ScheduleEditPageProps {
  schedule: Schedule | null;
  groupId: string;
  groupName: string;
  dayparts: Daypart[];
  onBack: () => void;
  onSuccess: () => void;
  onDelete?: (scheduleId: string) => Promise<void>;
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

export default function ScheduleEditPage({
  schedule,
  groupId,
  groupName,
  dayparts,
  onBack,
  onSuccess,
  onDelete
}: ScheduleEditPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<'regular' | 'event'>('regular');
  const [initialDays] = useState<number[]>(schedule?.days_of_week || []);
  const [removedDays, setRemovedDays] = useState<number[]>([]);
  const [showRemovedDaysPrompt, setShowRemovedDaysPrompt] = useState(false);
  const [formData, setFormData] = useState({
    daypart_definition_id: schedule?.daypart_definition_id || '',
    days_of_week: schedule?.days_of_week || [] as number[],
    start_time: schedule?.start_time || '06:00',
    end_time: schedule?.end_time || '11:00',
    schedule_name: schedule?.schedule_name || ''
  });

  const isNewSchedule = !schedule?.id;
  const isSuggestedDays = isNewSchedule && initialDays.length > 0;
  const isDaypartLocked = !!schedule?.id || isSuggestedDays;

  const handleDayToggle = (day: number) => {
    setFormData(prev => {
      const newDaysOfWeek = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b);

      // Track removed days if this is editing suggested days
      if (isSuggestedDays && initialDays.includes(day) && !newDaysOfWeek.includes(day)) {
        const newRemovedDays = initialDays.filter(d => !newDaysOfWeek.includes(d));
        setRemovedDays(newRemovedDays);
        setShowRemovedDaysPrompt(newRemovedDays.length > 0);
      } else if (isSuggestedDays) {
        const newRemovedDays = initialDays.filter(d => !newDaysOfWeek.includes(d));
        setRemovedDays(newRemovedDays);
        setShowRemovedDaysPrompt(newRemovedDays.length > 0);
      }

      return {
        ...prev,
        days_of_week: newDaysOfWeek
      };
    });
  };

  const handleScheduleRemovedDays = async () => {
    // Save current schedule first
    await handleSubmit(new Event('submit') as any);

    // Then create a new schedule for removed days
    const newSchedule: Schedule = {
      id: '',
      daypart_definition_id: formData.daypart_definition_id,
      placement_group_id: groupId,
      days_of_week: removedDays,
      start_time: formData.start_time,
      end_time: formData.end_time,
      runs_on_days: true,
      schedule_name: formData.schedule_name
    };

    // Navigate to edit page for removed days
    window.location.reload(); // Simplified - in production would use proper navigation
  };

  const formatRemovedDays = (): string => {
    return removedDays
      .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.fullLabel || '')
      .join(', ');
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

    // Validate times (always required)
    if (!formData.start_time) {
      setError('Start time is required');
      return;
    }
    if (!formData.end_time) {
      setError('End time is required');
      return;
    }
    if (formData.start_time === formData.end_time) {
      setError('Start time and end time must be different');
      return;
    }

    setLoading(true);

    try {
      const data = {
        daypart_definition_id: formData.daypart_definition_id,
        placement_group_id: groupId,
        days_of_week: formData.days_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        runs_on_days: true,
        schedule_name: formData.schedule_name || null
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {schedule?.id ? 'Edit Schedule' : (isSuggestedDays ? 'Schedule Days' : 'Add Daypart')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{groupName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-2 p-3 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Removed Days Warning */}
            {showRemovedDaysPrompt && removedDays.length > 0 && (
              <div className="p-4 m-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      You removed {formatRemovedDays()}
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      This daypart will not run on these days unless you create a separate schedule for them.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleScheduleRemovedDays}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#00adf0' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0099d6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00adf0'}
                  >
                    Schedule These Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRemovedDaysPrompt(false)}
                    className="px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-white dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/60 rounded-lg transition-colors"
                  >
                    Continue Without Scheduling
                  </button>
                </div>
              </div>
            )}

            {/* Suggested Days Helper Text */}
            {isSuggestedDays && !showRemovedDaysPrompt && (
              <div className="flex items-start gap-2 p-3 m-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Scheduling {formData.days_of_week.length} unscheduled day(s) for this daypart
                </p>
              </div>
            )}

            {/* Schedule Type Tabs */}
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

            {/* Form Fields */}
            <div className="p-4 space-y-4">
              {/* Daypart Type */}
              {isDaypartLocked ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Daypart Type
                  </label>
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {dayparts.find(d => d.id === formData.daypart_definition_id)?.display_label || 'Unknown Daypart'}
                    </p>
                  </div>
                </div>
              ) : (
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
              )}

              {/* Days of Week */}
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
                          ? 'text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                      style={formData.days_of_week.includes(day.value) ? { backgroundColor: '#00adf0' } : {}}
                      title={day.fullLabel}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Name */}
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

              {/* Time Fields */}
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

              {/* Remove Schedule Button - Only shown when editing */}
              {schedule && onDelete && (
                <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
                  >
                    Remove Schedule
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Fixed Footer with Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 disabled:bg-slate-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed font-medium"
              style={!loading ? { backgroundColor: '#00adf0' } : {}}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0099d6')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#00adf0')}
              onMouseDown={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0085bc')}
              onMouseUp={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0099d6')}
            >
              {loading ? 'Saving...' : (schedule?.id ? 'Save Schedule' : 'Add Schedule')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
