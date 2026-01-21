import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Palette, ChevronRight, Sun, Moon, MoonStar, Coffee, Sunrise, Sunset } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GroupScheduleManagerProps {
  groupId: string;
  groupName: string;
  onEditSchedule?: (schedule: Schedule | null) => void;
}

interface Schedule {
  id: string;
  daypart_definition_id: string;
  placement_group_id: string;
  days_of_week: number[];
  start_time: string;
  end_time?: string;
  runs_on_days?: boolean;
  schedule_name?: string;
  daypart_definitions?: {
    id: string;
    daypart_name: string;
    display_label: string;
    color: string;
    icon: string | null;
  };
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

const ICON_MAP: Record<string, any> = {
  Sun,
  Moon,
  MoonStar,
  Coffee,
  Sunrise,
  Sunset,
  Palette
};

export default function GroupScheduleManager({ groupId, groupName, onEditSchedule }: GroupScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

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

      const schedulesResult = await supabase
        .from('site_daypart_routines')
        .select('*, daypart_definitions(id, daypart_name, display_label, color, icon)')
        .eq('placement_group_id', groupId)
        .order('created_at', { ascending: false });

      if (schedulesResult.error) throw schedulesResult.error;

      setSchedules(schedulesResult.data || []);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDays = (days: number[]): string => {
    if (days.length === 7) return 'Every day';
    if (days.length === 0) return 'No days selected';

    const sortedDays = [...days].sort((a, b) => a - b);

    if (sortedDays.length === 5 && sortedDays.every(d => d >= 1 && d <= 5)) {
      return 'Weekdays';
    }

    if (sortedDays.length === 2 && sortedDays.includes(0) && sortedDays.includes(6)) {
      return 'Weekends';
    }

    return sortedDays
      .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label || '')
      .join(', ');
  };

  const parseColorClasses = (colorString: string) => {
    // Parse the color string like "bg-green-100 text-green-800 border-green-300"
    const bgMatch = colorString.match(/bg-(\w+)-(\d+)/);
    const textMatch = colorString.match(/text-(\w+)-(\d+)/);
    const borderMatch = colorString.match(/border-(\w+)-(\d+)/);

    if (!bgMatch || !textMatch || !borderMatch) {
      return {
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        border: 'border-cyan-300',
        bgLight: 'bg-cyan-50'
      };
    }

    const [, colorName] = bgMatch;

    return {
      bg: `bg-${colorName}-100`,
      text: `text-${colorName}-800`,
      border: `border-${colorName}-300`,
      bgLight: `bg-${colorName}-50`
    };
  };

  // Get unscheduled days for a specific daypart
  const getUnscheduledDays = (daypartId: string, daypartSchedules: Schedule[]): number[] => {
    const scheduledDays = new Set<number>();
    daypartSchedules.forEach(schedule => {
      schedule.days_of_week.forEach(day => scheduledDays.add(day));
    });

    const allDays = [0, 1, 2, 3, 4, 5, 6];
    return allDays.filter(day => !scheduledDays.has(day));
  };

  // Get day coverage count for a daypart
  const getDayCoverage = (daypartSchedules: Schedule[]): { scheduled: number; total: number } => {
    const scheduledDays = new Set<number>();
    daypartSchedules.forEach(schedule => {
      schedule.days_of_week.forEach(day => scheduledDays.add(day));
    });

    return {
      scheduled: scheduledDays.size,
      total: 7
    };
  };

  // Group schedules by daypart
  const groupSchedulesByDaypart = () => {
    const groups: Record<string, Schedule[]> = {};

    schedules.forEach(schedule => {
      const key = schedule.daypart_definition_id || 'unassigned';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(schedule);
    });

    // Sort schedules within each group by start time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        // Sort by start time
        return a.start_time.localeCompare(b.start_time);
      });
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const groupedSchedules = groupSchedulesByDaypart();
  const groupKeys = Object.keys(groupedSchedules);

  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-1">No schedules yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Create a schedule to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((groupKey) => {
            const groupSchedules = groupedSchedules[groupKey];
            const firstSchedule = groupSchedules[0];
            const daypartDef = firstSchedule.daypart_definitions;

            const colorClasses = daypartDef?.color
              ? parseColorClasses(daypartDef.color)
              : { border: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-800', bgLight: 'bg-slate-50' };

            const IconComponent = daypartDef?.icon
              ? ICON_MAP[daypartDef.icon] || Palette
              : Palette;

            const daypartLabel = daypartDef?.display_label || 'Unassigned';

            const unscheduledDays = getUnscheduledDays(groupKey, groupSchedules);
            const coverage = getDayCoverage(groupSchedules);
            const hasUnscheduledDays = unscheduledDays.length > 0;

            return (
              <div key={groupKey} className="space-y-2">
                {/* Daypart Group Header */}
                <div className="px-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${colorClasses.bg}`}>
                      <IconComponent className={`w-4 h-4 ${colorClasses.text}`} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {daypartLabel}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${colorClasses.bg} ${colorClasses.text}`}>
                        {coverage.scheduled} active
                      </span>
                      {coverage.scheduled < coverage.total && (
                        <span className="px-2 py-0.5 rounded-full font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {coverage.total - coverage.scheduled} inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule Cards */}
                <div className="space-y-2">
                  {groupSchedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      onClick={() => onEditSchedule?.(schedule)}
                      className={`w-full p-3 bg-white dark:bg-slate-900 border-l-4 border-r border-t border-b ${colorClasses.border} border-r-slate-200 border-t-slate-200 border-b-slate-200 dark:border-r-slate-700 dark:border-t-slate-700 dark:border-b-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-750 transition-colors text-left relative overflow-hidden`}
                    >
                      <div className={`absolute inset-0 ${colorClasses.bgLight} dark:bg-slate-800/50 opacity-20`}></div>

                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title: Day Pattern */}
                          <div className="mb-2">
                            <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                              {formatDays(schedule.days_of_week)}
                            </span>
                          </div>

                          {/* Day Badges */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {DAYS_OF_WEEK.map((day) => {
                              const isActive = schedule.days_of_week.includes(day.value);
                              return (
                                <div
                                  key={day.value}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                                    isActive
                                      ? `${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                  }`}
                                >
                                  {day.label}
                                </div>
                              );
                            })}
                          </div>

                          {/* Time Range */}
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              {schedule.end_time
                                ? `${schedule.start_time} - ${schedule.end_time}`
                                : `Starts at ${schedule.start_time}`
                              }
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}

                  {/* Add Schedule for Remaining Days Button */}
                  {hasUnscheduledDays && (
                    <button
                      onClick={() => {
                        const template = groupSchedules[0];
                        onEditSchedule?.({
                          id: '',
                          daypart_definition_id: template.daypart_definition_id,
                          placement_group_id: groupId,
                          days_of_week: unscheduledDays,
                          start_time: template.start_time,
                          end_time: template.end_time,
                          runs_on_days: true,
                          schedule_name: template.schedule_name
                        } as Schedule);
                      }}
                      className="w-full p-3 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Schedule Remaining Days ({unscheduledDays.length})
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Daypart Button */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onEditSchedule?.(null)}
          className="w-full px-6 py-3 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
          style={{ backgroundColor: '#00adf0' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0099d6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00adf0'}
          onMouseDown={(e) => e.currentTarget.style.backgroundColor = '#0085bc'}
          onMouseUp={(e) => e.currentTarget.style.backgroundColor = '#0099d6'}
        >
          <Plus className="w-5 h-5" />
          <span>Add Daypart</span>
        </button>
      </div>
    </div>
  );
}
