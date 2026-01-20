import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Palette, ChevronRight, Sparkles } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => onEditSchedule?.(schedule)}
              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-750 transition-colors text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-5 h-5 flex-shrink-0" style={{ color: '#00adf0' }} />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {schedule.daypart_definitions?.display_label || 'Unknown Daypart'}
                    </span>
                    {schedule.schedule_name && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        ({schedule.schedule_name})
                      </span>
                    )}
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

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => onEditSchedule?.(null)}
          className="w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          style={{ backgroundColor: '#00adf0' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0099d6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00adf0'}
          onMouseDown={(e) => e.currentTarget.style.backgroundColor = '#0085bc'}
          onMouseUp={(e) => e.currentTarget.style.backgroundColor = '#0099d6'}
          title="Add Schedule"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
