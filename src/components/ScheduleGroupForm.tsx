import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import TimeSelector from './TimeSelector';
import DaySelector from './DaySelector';
import { useScheduleCollisionDetection, Schedule } from '../hooks/useScheduleCollisionDetection';

interface ScheduleGroupFormProps {
  schedule: Schedule;
  allSchedules: Schedule[];
  onUpdate: (schedule: Schedule) => void;
  onSave: () => void;
  onCancel: () => void;
  level?: 'global' | 'site' | 'placement';
}

export default function ScheduleGroupForm({
  schedule,
  allSchedules,
  onUpdate,
  onSave,
  onCancel,
  level = 'global'
}: ScheduleGroupFormProps) {
  const [localSchedule, setLocalSchedule] = useState(schedule);

  const collision = useScheduleCollisionDetection(
    allSchedules,
    localSchedule.daypart_name,
    localSchedule.days_of_week,
    localSchedule.id
  );

  const handleToggleDay = (day: number) => {
    const newDays = localSchedule.days_of_week.includes(day)
      ? localSchedule.days_of_week.filter(d => d !== day)
      : [...localSchedule.days_of_week, day].sort();

    const updated = { ...localSchedule, days_of_week: newDays };
    setLocalSchedule(updated);
    onUpdate(updated);
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    const updated = { ...localSchedule, [field]: value };
    setLocalSchedule(updated);
    onUpdate(updated);
  };

  const handleSave = () => {
    if (localSchedule.days_of_week.length === 0) {
      return;
    }
    if (localSchedule.start_time >= localSchedule.end_time) {
      return;
    }
    if (collision.hasCollision) {
      return;
    }
    onSave();
  };

  const timeError = localSchedule.start_time >= localSchedule.end_time
    ? 'End time must be after start time'
    : null;

  const daysError = localSchedule.days_of_week.length === 0
    ? 'Please select at least one day'
    : null;

  const error = collision.collisionMessage || timeError || daysError;

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <DaySelector
        selectedDays={localSchedule.days_of_week}
        onToggleDay={handleToggleDay}
        schedules={allSchedules}
        currentDaypartName={localSchedule.daypart_name}
        editingScheduleId={localSchedule.id}
        showPresets={false}
      />

      <div className="grid grid-cols-2 gap-3">
        <TimeSelector
          label="Start Time *"
          value={localSchedule.start_time}
          onChange={(time) => handleTimeChange('start_time', time)}
        />
        <TimeSelector
          label="End Time *"
          value={localSchedule.end_time}
          onChange={(time) => handleTimeChange('end_time', time)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!!error}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          Save Schedule
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
