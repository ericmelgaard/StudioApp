import { useState } from 'react';
import { Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { DaypartRoutine } from './DaypartRoutineForm';

interface DaypartTimelineViewProps {
  routines: DaypartRoutine[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const DAYPART_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  breakfast: { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-900' },
  lunch: { bg: 'bg-green-200', border: 'border-green-400', text: 'text-green-900' },
  dinner: { bg: 'bg-blue-200', border: 'border-blue-400', text: 'text-blue-900' },
  late_night: { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-900' },
  dark_hours: { bg: 'bg-slate-200', border: 'border-slate-400', text: 'text-slate-900' }
};

const DAYPART_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  late_night: 'Late Night',
  dark_hours: 'Dark Hours'
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function detectOverlaps(routines: DaypartRoutine[]): Array<{ routine1: DaypartRoutine; routine2: DaypartRoutine; days: number[] }> {
  const overlaps: Array<{ routine1: DaypartRoutine; routine2: DaypartRoutine; days: number[] }> = [];

  for (let i = 0; i < routines.length; i++) {
    for (let j = i + 1; j < routines.length; j++) {
      const r1 = routines[i];
      const r2 = routines[j];

      const commonDays = r1.days_of_week.filter(day => r2.days_of_week.includes(day));

      if (commonDays.length > 0) {
        const start1 = timeToMinutes(r1.start_time);
        const end1 = timeToMinutes(r1.end_time);
        const start2 = timeToMinutes(r2.start_time);
        const end2 = timeToMinutes(r2.end_time);

        if (start1 < end2 && start2 < end1) {
          overlaps.push({ routine1: r1, routine2: r2, days: commonDays });
        }
      }
    }
  }

  return overlaps;
}

export default function DaypartTimelineView({ routines }: DaypartTimelineViewProps) {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const routinesForDay = routines.filter(r => r.days_of_week.includes(selectedDay));
  const overlaps = detectOverlaps(routinesForDay);
  const hasOverlaps = overlaps.length > 0;

  const startOfDay = 0;
  const endOfDay = 24 * 60;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <span className="font-medium text-slate-900">Timeline View</span>
          {hasOverlaps && (
            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">
              <AlertTriangle className="w-3 h-3" />
              {overlaps.length} overlap{overlaps.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {DAYS_OF_WEEK.map(day => {
              const dayRoutines = routines.filter(r => r.days_of_week.includes(day.value));
              return (
                <button
                  key={day.value}
                  onClick={() => setSelectedDay(day.value)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDay === day.value
                      ? 'bg-amber-600 text-white'
                      : dayRoutines.length > 0
                      ? 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <div>{day.label}</div>
                  <div className="text-xs opacity-75">{dayRoutines.length}</div>
                </button>
              );
            })}
          </div>

          {routinesForDay.length === 0 ? (
            <div className="text-center py-4 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No dayparts configured for {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label}</p>
            </div>
          ) : (
            <>
              <div className="relative bg-slate-50 rounded-lg p-4" style={{ minHeight: '200px' }}>
                <div className="absolute left-0 right-0 top-4 bottom-4 flex flex-col justify-between">
                  {[0, 6, 12, 18, 24].map(hour => (
                    <div key={hour} className="flex items-center text-xs text-slate-400">
                      <span className="w-12">{hour.toString().padStart(2, '0')}:00</span>
                      <div className="flex-1 border-t border-slate-200 ml-2" />
                    </div>
                  ))}
                </div>

                <div className="relative ml-14 mr-4" style={{ height: '176px' }}>
                  {routinesForDay.map((routine, index) => {
                    const start = timeToMinutes(routine.start_time);
                    const end = timeToMinutes(routine.end_time);
                    const top = (start / endOfDay) * 100;
                    const height = ((end - start) / endOfDay) * 100;

                    const colors = DAYPART_COLORS[routine.daypart_name] || DAYPART_COLORS.breakfast;

                    return (
                      <div
                        key={routine.id || index}
                        className={`absolute left-0 right-0 ${colors.bg} ${colors.border} border-2 rounded px-2 py-1 z-10`}
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          minHeight: '24px'
                        }}
                      >
                        <div className={`text-xs font-semibold ${colors.text}`}>
                          {DAYPART_LABELS[routine.daypart_name]}
                        </div>
                        <div className={`text-xs ${colors.text} opacity-75`}>
                          {routine.start_time} - {routine.end_time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {hasOverlaps && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-900 mb-1">Time Overlaps Detected</h4>
                      <div className="text-sm text-amber-800 space-y-1">
                        {overlaps.map((overlap, index) => (
                          <div key={index}>
                            <strong>{DAYPART_LABELS[overlap.routine1.daypart_name]}</strong> and{' '}
                            <strong>{DAYPART_LABELS[overlap.routine2.daypart_name]}</strong> overlap on{' '}
                            {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-amber-700 mt-2">
                        Note: Overlaps are allowed but may need review to ensure correct operation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
