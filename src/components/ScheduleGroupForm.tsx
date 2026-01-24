import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Sparkles, Info, Trash2 } from 'lucide-react';
import TimeSelector from './TimeSelector';
import DaySelector from './DaySelector';
import HolidayTemplatePicker from './HolidayTemplatePicker';
import { useScheduleCollisionDetection, Schedule } from '../hooks/useScheduleCollisionDetection';
import { ScheduleType, RecurrenceType, RecurrenceConfig, DayPosition, getPriorityLevel, formatRecurrenceText } from '../types/schedules';

interface DaypartOption {
  id: string;
  daypart_name: string;
  display_label: string;
  source_level: string;
}

interface ScheduleGroupFormProps {
  schedule: Schedule;
  allSchedules: Schedule[];
  onUpdate: (schedule: Schedule) => void;
  onSave: (schedule?: Schedule) => void;
  onCancel: () => void;
  level?: 'global' | 'site' | 'placement';
  showDaypartSelector?: boolean;
  availableDayparts?: DaypartOption[];
  selectedDaypartId?: string;
  onDaypartChange?: (daypartId: string, daypartName: string) => void;
  skipDayValidation?: boolean;
  disableCollisionDetection?: boolean;
  onDelete?: (scheduleId: string, source?: 'site' | 'store') => Promise<void>;
  onRemovedDays?: (days: number[]) => void;
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

export default function ScheduleGroupForm({
  schedule,
  allSchedules,
  onUpdate,
  onSave,
  onCancel,
  level = 'global',
  showDaypartSelector = false,
  availableDayparts = [],
  selectedDaypartId = '',
  onDaypartChange,
  skipDayValidation = false,
  disableCollisionDetection = false,
  onDelete,
  onRemovedDays
}: ScheduleGroupFormProps) {
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const scheduleType = schedule.schedule_type || 'regular';
  const [eventName, setEventName] = useState(schedule.event_name || '');
  const [eventDate, setEventDate] = useState(schedule.event_date || '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(schedule.recurrence_type || 'none');
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>(schedule.recurrence_config || {});
  const [initialDays] = useState<number[]>(schedule?.days_of_week || []);
  const [removedDays, setRemovedDays] = useState<number[]>([]);

  const collision = useScheduleCollisionDetection(
    allSchedules,
    localSchedule.daypart_name,
    localSchedule.days_of_week,
    localSchedule.id,
    scheduleType
  );

  useEffect(() => {
    if (schedule.id && initialDays.length > 0) {
      const newRemovedDays = initialDays.filter(d => !localSchedule.days_of_week.includes(d));
      setRemovedDays(newRemovedDays);
      if (onRemovedDays) {
        onRemovedDays(newRemovedDays);
      }
    }
  }, [localSchedule.days_of_week, initialDays, schedule.id, onRemovedDays]);

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

  const handleTemplateSelect = (templates: any[]) => {
    if (templates.length > 0) {
      const template = templates[0];
      setEventName(template.name);
      setRecurrenceType(template.recurrence_type);
      setRecurrenceConfig(template.recurrence_config);
      if (template.is_closed) {
        handleTimeChange('start_time', '00:00');
        handleTimeChange('end_time', '23:59');
      } else if (template.suggested_hours) {
        handleTimeChange('start_time', template.suggested_hours.start_time);
        handleTimeChange('end_time', template.suggested_hours.end_time);
      }
      setShowTemplatePicker(false);
    }
  };

  const handleRecurrenceConfigChange = (field: string, value: any) => {
    setRecurrenceConfig({ ...recurrenceConfig, [field]: value });
  };

  const handleSave = () => {
    if (showDaypartSelector && !selectedDaypartId) {
      return;
    }
    if (scheduleType === 'regular' && !skipDayValidation) {
      if (localSchedule.days_of_week.length === 0) {
        return;
      }
    }
    if (scheduleType === 'event_holiday' && !eventName) {
      return;
    }
    if (collision.hasCollision && !disableCollisionDetection) {
      return;
    }
    if (localSchedule.start_time === localSchedule.end_time) {
      alert('Start time and end time must be different');
      return;
    }

    const updatedSchedule: Schedule = {
      ...localSchedule,
      schedule_type: scheduleType,
      runs_on_days: true,
      priority_level: scheduleType === 'event_holiday' ? getPriorityLevel(recurrenceType) : 10
    };

    if (scheduleType === 'event_holiday') {
      updatedSchedule.event_name = eventName;
      updatedSchedule.event_date = eventDate || undefined;
      updatedSchedule.recurrence_type = recurrenceType;
      updatedSchedule.recurrence_config = recurrenceConfig;
    }

    onUpdate(updatedSchedule);
    onSave(updatedSchedule);
  };

  const handleDelete = async () => {
    if (!schedule.id || !onDelete) return;

    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return;
    }

    try {
      await onDelete(schedule.id, (schedule as any).source);
    } catch (err: any) {
      alert(`Failed to delete schedule: ${err.message}`);
    }
  };

  const daypartError = showDaypartSelector && !selectedDaypartId
    ? 'Please select a daypart type'
    : null;

  const timeError = null;

  const daysError = scheduleType === 'regular' && !skipDayValidation && localSchedule.days_of_week.length === 0
    ? 'Please select at least one day'
    : null;

  const eventNameError = scheduleType === 'event_holiday' && !eventName
    ? 'Event name is required'
    : null;

  const error = daypartError || (disableCollisionDetection ? null : collision.collisionMessage) || timeError || daysError || eventNameError;

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-4">
      {scheduleType === 'event_holiday' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Event schedules override all regular schedules</p>
            <p className="text-blue-700">No collision checking needed for events and holidays</p>
          </div>
        </div>
      )}

      {showDaypartSelector && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Daypart Type *
          </label>
          <select
            value={selectedDaypartId}
            onChange={(e) => {
              const selectedOption = availableDayparts.find(d => d.id === e.target.value);
              if (selectedOption && onDaypartChange) {
                onDaypartChange(selectedOption.id, selectedOption.daypart_name);
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a daypart...</option>
            {availableDayparts.map((daypart) => (
              <option key={daypart.id} value={daypart.id}>
                {daypart.display_label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && scheduleType === 'regular' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {scheduleType === 'event_holiday' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowTemplatePicker(true)}
            className="w-full px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Quick Add from Holiday Template
          </button>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., Christmas Day, Holiday Season"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Recurrence Type
            </label>
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="none">One-time Date</option>
              <option value="annual_date">Annual (same date)</option>
              <option value="monthly_date">Monthly (same day)</option>
              <option value="annual_relative">Annual (relative day)</option>
              <option value="annual_date_range">Annual Date Range</option>
            </select>
          </div>

          {recurrenceType === 'none' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {recurrenceType === 'annual_date' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Month
                </label>
                <select
                  value={recurrenceConfig.month || ''}
                  onChange={(e) => handleRecurrenceConfigChange('month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select month</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Day
                </label>
                <select
                  value={recurrenceConfig.day_of_month || ''}
                  onChange={(e) => handleRecurrenceConfigChange('day_of_month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {recurrenceType === 'monthly_date' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Day of Month
              </label>
              <select
                value={recurrenceConfig.day_of_month || ''}
                onChange={(e) => handleRecurrenceConfigChange('day_of_month', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {recurrenceType === 'annual_relative' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Position
                </label>
                <select
                  value={recurrenceConfig.position || ''}
                  onChange={(e) => handleRecurrenceConfigChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select</option>
                  <option value="first">First</option>
                  <option value="second">Second</option>
                  <option value="third">Third</option>
                  <option value="fourth">Fourth</option>
                  <option value="last">Last</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Weekday
                </label>
                <select
                  value={recurrenceConfig.weekday !== undefined ? recurrenceConfig.weekday : ''}
                  onChange={(e) => handleRecurrenceConfigChange('weekday', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select</option>
                  {DAY_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Month
                </label>
                <select
                  value={recurrenceConfig.month || ''}
                  onChange={(e) => handleRecurrenceConfigChange('month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {recurrenceType === 'annual_date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={recurrenceConfig.range_start_date || ''}
                  onChange={(e) => handleRecurrenceConfigChange('range_start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={recurrenceConfig.range_end_date || ''}
                  onChange={(e) => handleRecurrenceConfigChange('range_end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {recurrenceType && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-900">
                  {formatRecurrenceText(recurrenceType, recurrenceConfig, eventDate)}
                </span>
              </div>
            </div>
          )}

          {scheduleType === 'event_holiday' && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              <span className="font-medium">
                Priority: {getPriorityLevel(recurrenceType) === 100 ? 'Single Day' : 'Date Range'}
              </span>
            </div>
          )}
        </div>
      )}

      {scheduleType === 'regular' && (
        <DaySelector
          selectedDays={localSchedule.days_of_week}
          onToggleDay={handleToggleDay}
          schedules={allSchedules}
          currentDaypartName={localSchedule.daypart_name}
          editingScheduleId={localSchedule.id}
          showPresets={false}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <TimeSelector
          label="Start Time *"
          value={localSchedule.start_time || '09:00'}
          onChange={(time) => handleTimeChange('start_time', time)}
        />
        <TimeSelector
          label="End Time *"
          value={localSchedule.end_time || '17:00'}
          onChange={(time) => handleTimeChange('end_time', time)}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {schedule.id && onDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!!error}
            style={{ backgroundColor: '#00adf0' }}
            className="px-4 py-2 text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            onMouseEnter={(e) => !error && (e.currentTarget.style.backgroundColor = '#00c3ff')}
            onMouseLeave={(e) => !error && (e.currentTarget.style.backgroundColor = '#00adf0')}
          >
            Save
          </button>
        </div>
      </div>

      {showTemplatePicker && (
        <HolidayTemplatePicker
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplatePicker(false)}
          allowMultiple={false}
        />
      )}
    </div>
  );
}
