import { Clock, Edit2, Trash2, Calendar, Sparkles } from 'lucide-react';
import { Schedule } from '../hooks/useScheduleCollisionDetection';

interface ScheduleGroupCardProps {
  schedule: Schedule;
  onEdit: () => void;
  onDelete: () => void;
  color?: string;
  level?: 'global' | 'site' | 'placement';
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

function getScheduleLabel(days: number[]): string {
  const sorted = [...days].sort();

  if (sorted.length === 0) return 'No days';
  if (sorted.length === 7) return 'All Days';

  const isWeekdays = sorted.length === 5 && sorted.every(d => [1, 2, 3, 4, 5].includes(d));
  if (isWeekdays) return 'Weekdays';

  const isWeekend = sorted.length === 2 && sorted.every(d => [0, 6].includes(d));
  if (isWeekend) return 'Weekend';

  if (sorted.length === 1) {
    return DAYS_OF_WEEK.find(d => d.value === sorted[0])?.label || '';
  }

  return sorted.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ');
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function ScheduleGroupCard({
  schedule,
  onEdit,
  onDelete,
  color,
  level = 'global'
}: ScheduleGroupCardProps) {
  const levelColors = {
    global: 'bg-slate-100 text-slate-700',
    site: 'bg-blue-100 text-blue-700',
    placement: 'bg-amber-100 text-amber-700'
  };

  const isHolidayOrEvent = schedule.schedule_type === 'event_holiday';
  const dayBadgeColor = levelColors[level];

  const Icon = isHolidayOrEvent ? Sparkles : Clock;

  const cardBorderColor = isHolidayOrEvent
    ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'
    : 'border-slate-200';

  return (
    <div className={`p-4 bg-white rounded-lg border ${cardBorderColor} hover:border-slate-300 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${isHolidayOrEvent ? 'text-purple-500' : 'text-slate-400'}`} />
          <div>
            {schedule.schedule_name ? (
              <div className="text-sm text-slate-900">
                <span className="font-bold">{schedule.schedule_name}</span>{' '}
                <span className="text-slate-600">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </span>
              </div>
            ) : (
              <>
                <h4 className="font-semibold text-slate-900">{getScheduleLabel(schedule.days_of_week)}</h4>
                <p className="text-sm text-slate-600 mt-0.5">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit schedule"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete schedule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {isHolidayOrEvent ? (
          <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-md font-medium shadow-sm">
            {schedule.schedule_name || schedule.event_name || 'Holiday Schedule'}
          </span>
        ) : (
          schedule.days_of_week.sort().map((day) => {
            const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
            return (
              <span
                key={day}
                className={`px-2.5 py-1 ${dayBadgeColor} text-xs rounded-md font-medium`}
              >
                {dayInfo?.short}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
