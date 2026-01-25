import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Calendar, Sparkles, Combine } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TimeSelector from '../components/TimeSelector';
import { getDayCollisionStatus as checkDayCollision, Schedule as CollisionSchedule } from '../hooks/useScheduleCollisionDetection';

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

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const getDaypartColorStyles = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) return { backgroundColor: '#00adf0' };
  return {
    backgroundColor: color,
    '--hover-color': `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`,
    '--active-color': `rgb(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)})`
  } as React.CSSProperties;
};

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
  const [initialDays] = useState<number[]>(schedule?.days_of_week || []);
  const [removedDays, setRemovedDays] = useState<number[]>([]);
  const [showRemovedDaysPrompt, setShowRemovedDaysPrompt] = useState(false);
  const [showMergePrompt, setShowMergePrompt] = useState(false);
  const [mergeableSchedules, setMergeableSchedules] = useState<Schedule[]>([]);
  const [savedScheduleId, setSavedScheduleId] = useState<string | null>(null);
  const [isSchedulingRemovedDays, setIsSchedulingRemovedDays] = useState(false);
  const [allSchedules, setAllSchedules] = useState<CollisionSchedule[]>([]);
  const [formData, setFormData] = useState({
    daypart_definition_id: schedule?.daypart_definition_id || '',
    days_of_week: schedule?.days_of_week || [] as number[],
    start_time: schedule?.start_time || '06:00',
    end_time: schedule?.end_time || '11:00',
    schedule_name: schedule?.schedule_name || ''
  });

  const [initialFormData] = useState({
    daypart_definition_id: schedule?.daypart_definition_id || '',
    days_of_week: schedule?.days_of_week || [] as number[],
    start_time: schedule?.start_time || '06:00',
    end_time: schedule?.end_time || '11:00',
    schedule_name: schedule?.schedule_name || ''
  });

  useEffect(() => {
    if (dayparts.length > 0) {
      loadExistingSchedules();
    }
  }, [groupId, dayparts]);

  const isNewSchedule = !schedule?.id || isSchedulingRemovedDays;
  const isSuggestedDays = isNewSchedule && initialDays.length > 0;
  const isDaypartLocked = (!!schedule?.id && !isSchedulingRemovedDays) || isSuggestedDays;

  const selectedDaypart = dayparts.find(d => d.id === formData.daypart_definition_id);
  const daypartColor = selectedDaypart?.color || '#00adf0';
  const daypartColorStyles = getDaypartColorStyles(daypartColor);

  const hasChanges = () => {
    if (isNewSchedule) return true;

    return (
      formData.daypart_definition_id !== initialFormData.daypart_definition_id ||
      formData.start_time !== initialFormData.start_time ||
      formData.end_time !== initialFormData.end_time ||
      formData.schedule_name !== initialFormData.schedule_name ||
      JSON.stringify(formData.days_of_week.sort()) !== JSON.stringify(initialFormData.days_of_week.sort())
    );
  };

  const loadExistingSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('placement_daypart_overrides')
        .select('id, daypart_definition_id, days_of_week, start_time, end_time, schedule_name, schedule_type')
        .eq('placement_group_id', groupId);

      if (error) throw error;

      const schedulesWithNames: CollisionSchedule[] = (data || []).map(s => {
        const daypart = dayparts.find(d => d.id === s.daypart_definition_id);
        return {
          id: s.id,
          daypart_name: daypart?.daypart_name || '',
          days_of_week: s.days_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          schedule_name: s.schedule_name,
          schedule_type: s.schedule_type
        };
      });

      setAllSchedules(schedulesWithNames);
    } catch (err) {
      console.error('Error loading schedules:', err);
    }
  };

  const getDayCollisionStatus = (day: number): boolean => {
    if (!formData.daypart_definition_id || formData.days_of_week.includes(day)) return false;

    const currentDaypartName = selectedDaypart?.daypart_name;
    if (!currentDaypartName) return false;

    return checkDayCollision(
      allSchedules,
      currentDaypartName,
      day,
      formData.days_of_week,
      schedule?.id
    );
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => {
      const newDaysOfWeek = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b);

      // Only track removed days if we're still working on the original schedule
      // Don't track if we're scheduling removed days from a previous save
      if (initialDays.length > 0 && !isSchedulingRemovedDays) {
        const newRemovedDays = initialDays.filter(d => !newDaysOfWeek.includes(d));
        setRemovedDays(newRemovedDays);
      }

      return {
        ...prev,
        days_of_week: newDaysOfWeek
      };
    });
  };

  const handleScheduleRemovedDays = () => {
    // Reset form to create a new schedule with the removed days
    setFormData({
      daypart_definition_id: formData.daypart_definition_id,
      placement_group_id: groupId,
      days_of_week: removedDays,
      start_time: formData.start_time,
      end_time: formData.end_time,
      runs_on_days: true,
      schedule_name: formData.schedule_name || null
    });

    // Mark that we're now scheduling removed days (not editing the original schedule)
    setIsSchedulingRemovedDays(true);

    // Clear saved schedule ID and removed days tracking
    setSavedScheduleId(null);
    setRemovedDays([]);

    // Close the prompt - user can now edit and save
    setShowRemovedDaysPrompt(false);
  };

  const handleSkipRemovedDays = () => {
    setShowRemovedDaysPrompt(false);
    onSuccess();
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

      let scheduleId: string;

      if (schedule?.id && !isSchedulingRemovedDays) {
        const { error } = await supabase
          .from('placement_daypart_overrides')
          .update(data)
          .eq('id', schedule.id);

        if (error) throw error;
        scheduleId = schedule.id;
      } else {
        const { data: newSchedule, error } = await supabase
          .from('placement_daypart_overrides')
          .insert(data)
          .select('id')
          .single();

        if (error) throw error;
        scheduleId = newSchedule.id;
      }

      // Check for mergeable schedules
      const { data: otherSchedules, error: queryError } = await supabase
        .from('placement_daypart_overrides')
        .select('*')
        .eq('placement_group_id', groupId)
        .eq('daypart_definition_id', formData.daypart_definition_id)
        .eq('start_time', formData.start_time)
        .eq('end_time', formData.end_time)
        .neq('id', scheduleId);

      if (queryError) throw queryError;

      if (otherSchedules && otherSchedules.length > 0) {
        // Found schedules with same times but different days
        setSavedScheduleId(scheduleId);
        setMergeableSchedules(otherSchedules);
        setShowMergePrompt(true);
      } else if (removedDays.length > 0) {
        // Check if removed days are already covered by other schedules for this daypart
        const { data: allSchedules, error: allSchedulesError } = await supabase
          .from('placement_daypart_overrides')
          .select('days_of_week')
          .eq('placement_group_id', groupId)
          .eq('daypart_definition_id', formData.daypart_definition_id)
          .neq('id', scheduleId);

        if (allSchedulesError) throw allSchedulesError;

        // Collect all days covered by other schedules
        const coveredDays = new Set<number>();
        if (allSchedules) {
          allSchedules.forEach(sched => {
            sched.days_of_week.forEach((day: number) => coveredDays.add(day));
          });
        }

        // Find which removed days are NOT covered by other schedules
        const uncoveredRemovedDays = removedDays.filter(day => !coveredDays.has(day));

        if (uncoveredRemovedDays.length > 0) {
          // Only show prompt if there are uncovered days
          setRemovedDays(uncoveredRemovedDays);
          setSavedScheduleId(scheduleId);
          setShowRemovedDaysPrompt(true);
        } else {
          // All removed days are covered by other schedules, go back
          onSuccess();
        }
      } else {
        // No merge needed and no removed days, go back
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeSchedules = async () => {
    if (!savedScheduleId || mergeableSchedules.length === 0) return;

    setLoading(true);
    try {
      // Get the current schedule that was just saved
      const { data: currentSchedule, error: fetchError } = await supabase
        .from('placement_daypart_overrides')
        .select('days_of_week')
        .eq('id', savedScheduleId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!currentSchedule) {
        throw new Error('Schedule not found');
      }

      // Combine all days from all schedules
      const allDays = new Set<number>(currentSchedule.days_of_week);
      mergeableSchedules.forEach(schedule => {
        schedule.days_of_week.forEach(day => allDays.add(day));
      });

      const combinedDays = Array.from(allDays).sort((a, b) => a - b);

      // Delete all other schedules FIRST to avoid collision
      const schedulesToDelete = mergeableSchedules.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('placement_daypart_overrides')
        .delete()
        .in('id', schedulesToDelete);

      if (deleteError) throw deleteError;

      // Now update the current schedule with combined days and clear the name
      const { error: updateError } = await supabase
        .from('placement_daypart_overrides')
        .update({
          days_of_week: combinedDays,
          schedule_name: null
        })
        .eq('id', savedScheduleId);

      if (updateError) throw updateError;

      // Success - go back
      onSuccess();
    } catch (err) {
      console.error('Error merging schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to merge schedules');
      setShowMergePrompt(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipMerge = () => {
    setShowMergePrompt(false);
    onSuccess();
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

  const formatDaysList = (days: number[]): string => {
    return days
      .sort((a, b) => a - b)
      .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label || '')
      .join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Colored Header with Daypart Name and Save Button */}
        <div className="px-6 py-4" style={{ backgroundColor: daypartColor + '30' }}>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {selectedDaypart?.display_label || 'Daypart'}
              </h2>
              <span className="text-sm text-slate-700 dark:text-slate-300">Schedule</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !hasChanges()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading || !hasChanges()
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Suggested Days Helper Text */}
            {isSuggestedDays && (
              <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Scheduling {formData.days_of_week.length} unscheduled day(s) for this daypart
                </p>
              </div>
            )}

            {/* Daypart Type - Only shown when adding new */}
            {!isDaypartLocked && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Daypart Type *
                </label>
                <select
                  value={formData.daypart_definition_id}
                  onChange={(e) => setFormData({ ...formData, daypart_definition_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': daypartColor } as React.CSSProperties}
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

              {/* Collision Legend */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full border-2 border-red-400"></div>
                <span className="text-xs text-slate-600 dark:text-slate-400">Day has conflicting schedule</span>
              </div>

              <div className="flex justify-center gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = formData.days_of_week.includes(day.value);
                  const hasCollision = getDayCollisionStatus(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={`w-10 h-10 rounded-full font-medium text-sm transition-all ${
                        isSelected
                          ? 'text-white shadow-md'
                          : hasCollision
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      } ${hasCollision && !isSelected ? 'ring-2 ring-red-400' : ''}`}
                      style={isSelected ? daypartColorStyles : {}}
                      title={day.fullLabel}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {formData.days_of_week.length > 0 && (
                <div className="mt-2 text-xs text-center text-slate-600 dark:text-slate-400">
                  {formData.days_of_week.length} {formData.days_of_week.length === 1 ? 'day' : 'days'} selected
                </div>
              )}
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              <TimeSelector
                label="Start Time *"
                value={formData.start_time}
                onChange={(time) => setFormData({ ...formData, start_time: time })}
              />

              <TimeSelector
                label="End Time *"
                value={formData.end_time}
                onChange={(time) => setFormData({ ...formData, end_time: time })}
              />
            </div>
          </form>
        </div>

        {/* Footer with Delete Button */}
        {schedule && onDelete && !isSchedulingRemovedDays && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-6 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Merge Prompt Modal */}
      {showMergePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${daypartColor}20` }}>
                  <Combine className="w-5 h-5" style={{ color: daypartColor }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Merge Schedules?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You have {mergeableSchedules.length + 1} schedules with the same times on different days
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {mergeableSchedules.map((sched) => (
                  <div
                    key={sched.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatDaysList(sched.days_of_week)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg mb-6" style={{ backgroundColor: `${daypartColor}15`, borderColor: `${daypartColor}40`, borderWidth: '1px' }}>
                <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: daypartColor }} />
                <p className="text-sm text-slate-900 dark:text-slate-100">
                  Combine into one schedule covering all days
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipMerge}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Keep Separate
                </button>
                <button
                  onClick={handleMergeSchedules}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={!loading ? daypartColorStyles : {}}
                >
                  {loading ? 'Merging...' : 'Merge Schedules'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removed Days Prompt Modal */}
      {showRemovedDaysPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Schedule Removed Days?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You removed {formatRemovedDays()} from this schedule
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-6">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  This daypart will not run on these days unless you create a separate schedule for them.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipRemovedDays}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Don't Schedule
                </button>
                <button
                  onClick={handleScheduleRemovedDays}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all"
                  style={daypartColorStyles}
                >
                  Schedule These Days
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
