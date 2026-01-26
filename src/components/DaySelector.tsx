import { getDayCollisionStatus, getDayUsageInfo, Schedule } from '../hooks/useScheduleCollisionDetection';

interface DaySelectorProps {
  selectedDays: number[];
  onToggleDay: (day: number) => void;
  schedules?: Schedule[];
  currentDaypartName?: string;
  editingScheduleId?: string;
  showPresets?: boolean;
  daypartColor?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'S' },
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'T' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'S' }
];

const PRESETS = {
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
  allDays: [0, 1, 2, 3, 4, 5, 6]
};

export default function DaySelector({
  selectedDays,
  onToggleDay,
  schedules = [],
  currentDaypartName = '',
  editingScheduleId,
  showPresets = true,
  daypartColor
}: DaySelectorProps) {

  const applyPreset = (preset: number[]) => {
    preset.forEach(day => {
      if (!selectedDays.includes(day)) {
        onToggleDay(day);
      }
    });
    selectedDays.forEach(day => {
      if (!preset.includes(day)) {
        onToggleDay(day);
      }
    });
  };

  const clearAll = () => {
    selectedDays.forEach(day => onToggleDay(day));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Days of the Week *</label>
        {showPresets && (
          <button
            type="button"
            onClick={selectedDays.length === 7 ? clearAll : () => applyPreset(PRESETS.allDays)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {selectedDays.length === 7 ? 'Clear All' : 'Select All'}
          </button>
        )}
      </div>

      {showPresets && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => applyPreset(PRESETS.weekdays)}
            className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Weekdays
          </button>
          <button
            type="button"
            onClick={() => applyPreset(PRESETS.weekend)}
            className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Weekend
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {schedules.length > 0 && currentDaypartName && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-red-400 dark:border-red-500"></div>
            <span>Day has conflicting schedule</span>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-2">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDays.includes(day.value);
          const hasCollision = schedules.length > 0 && currentDaypartName
            ? getDayCollisionStatus(schedules, currentDaypartName, day.value, selectedDays, editingScheduleId)
            : false;

          return (
            <button
              key={day.value}
              type="button"
              onClick={() => (hasCollision && !isSelected) ? undefined : onToggleDay(day.value)}
              disabled={hasCollision && !isSelected}
              className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-[#00adf0] text-white shadow-md hover:bg-[#0094d1]'
                  : hasCollision
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              } ${hasCollision ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}`}
              title={
                hasCollision
                  ? `${day.label} already scheduled in this daypart${isSelected ? ' - click to remove' : ''}`
                  : day.label
              }
            >
              {day.short}
            </button>
          );
        })}
      </div>

      {selectedDays.length > 0 && (
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
        </div>
      )}
    </div>
  );
}
