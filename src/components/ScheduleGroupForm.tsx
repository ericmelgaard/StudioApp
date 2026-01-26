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
  onScheduleUnscheduledDays?: (days: number[], template: Schedule) => void;
  daypartColor?: string;
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
  daypartColor,
  availableDayparts = [],
  selectedDaypartId = '',
  onDaypartChange,
  skipDayValidation = false,
  disableCollisionDetection = false,
  onDelete,
  onRemovedDays,
  onScheduleUnscheduledDays
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
  const [showUnscheduledPrompt, setShowUnscheduledPrompt] = useState(false);
  const [unscheduledDays, setUnscheduledDays] = useState<number[]>([]);

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

  const getUnscheduledDays = (): number[] => {
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const scheduledDays = new Set<number>();

    allSchedules
      .filter(s =>
        s.schedule_type === 'regular' &&
        s.daypart_name === localSchedule.daypart_name &&
        s.id !== localSchedule.id
      )
      .forEach(s => {
        s.days_of_week?.forEach(day => scheduledDays.add(day));
      });

    localSchedule.days_of_week?.forEach(day => scheduledDays.add(day));

    return allDays.filter(day => !scheduledDays.has(day));
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

    if (scheduleType === 'regular' && !skipDayValidation) {
      const remaining = getUnscheduledDays();
      if (remaining.length > 0) {
        setUnscheduledDays(remaining);
        setShowUnscheduledPrompt(true);
        return;
      }
    }

    completeSave();
  };

  const completeSave = () => {
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

  const hasChanges = () => {
    if (!schedule.id) return true;

    const regularFieldsChanged =
      JSON.stringify(schedule.days_of_week) !== JSON.stringify(localSchedule.days_of_week) ||
      schedule.start_time !== localSchedule.start_time ||
      schedule.end_time !== localSchedule.end_time;

    const eventFieldsChanged = scheduleType === 'event_holiday' && (
      schedule.event_name !== eventName ||
      schedule.event_date !== eventDate ||
      schedule.recurrence_type !== recurrenceType ||
      JSON.stringify(schedule.recurrence_config) !== JSON.stringify(recurrenceConfig)
    );

    return regularFieldsChanged || eventFieldsChanged;
  };

  const canSave = !error && hasChanges();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Edit Schedule
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg font-medium text-sm transition-all bg-[#00adf0] text-white hover:bg-[#00c3ff]"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900">
      {scheduleType === 'event_holiday' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Event schedules override all regular schedules</p>
            <p className="text-blue-700 dark:text-blue-300">No collision checking needed for events and holidays</p>
          </div>
        </div>
      )}

      {showDaypartSelector && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
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
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {scheduleType === 'event_holiday' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowTemplatePicker(true)}
            className="w-full px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Quick Add from Holiday Template
          </button>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., Christmas Day, Holiday Season"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Recurrence Type
            </label>
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
              />
            </div>
          )}

          {recurrenceType === 'annual_date' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Month
                </label>
                <select
                  value={recurrenceConfig.month || ''}
                  onChange={(e) => handleRecurrenceConfigChange('month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
                >
                  <option value="">Select month</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Day
                </label>
                <select
                  value={recurrenceConfig.day_of_month || ''}
                  onChange={(e) => handleRecurrenceConfigChange('day_of_month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Day of Month
              </label>
              <select
                value={recurrenceConfig.day_of_month || ''}
                onChange={(e) => handleRecurrenceConfigChange('day_of_month', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Position
                </label>
                <select
                  value={recurrenceConfig.position || ''}
                  onChange={(e) => handleRecurrenceConfigChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Weekday
                </label>
                <select
                  value={recurrenceConfig.weekday !== undefined ? recurrenceConfig.weekday : ''}
                  onChange={(e) => handleRecurrenceConfigChange('weekday', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
                >
                  <option value="">Select</option>
                  {DAY_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Month
                </label>
                <select
                  value={recurrenceConfig.month || ''}
                  onChange={(e) => handleRecurrenceConfigChange('month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={recurrenceConfig.range_start_date || ''}
                  onChange={(e) => handleRecurrenceConfigChange('range_start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={recurrenceConfig.range_end_date || ''}
                  onChange={(e) => handleRecurrenceConfigChange('range_end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
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
          daypartColor={daypartColor}
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
      </div>

      {schedule.id && onDelete && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 flex justify-center">
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Schedule
          </button>
        </div>
      )}

      {showTemplatePicker && (
        <HolidayTemplatePicker
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplatePicker(false)}
          allowMultiple={false}
        />
      )}

      {showUnscheduledPrompt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={() => {
            setShowUnscheduledPrompt(false);
            completeSave();
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-2"
              style={{
                backgroundColor: daypartColor || '#3b82f6'
              }}
            />

            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: daypartColor ? `${daypartColor}20` : '#dbeafe'
                  }}
                >
                  <Calendar
                    className="w-6 h-6"
                    style={{ color: daypartColor || '#3b82f6' }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Schedule Saved Successfully
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your schedule has been saved. However, <span className="font-medium text-slate-900">{unscheduledDays.map(d => DAYS_OF_WEEK[d].label).join(', ')}</span> {unscheduledDays.length === 1 ? 'still has' : 'still have'} no schedule for this daypart.
                  </p>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Would you like to create a schedule for {unscheduledDays.length === 1 ? 'this day' : 'these days'} now?
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                {onScheduleUnscheduledDays && (
                  <button
                    onClick={() => {
                      setShowUnscheduledPrompt(false);
                      onScheduleUnscheduledDays(unscheduledDays, localSchedule);
                    }}
                    className="w-full px-4 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg text-white"
                    style={{
                      backgroundColor: daypartColor || '#3b82f6'
                    }}
                    onMouseEnter={(e) => {
                      const color = daypartColor || '#3b82f6';
                      e.currentTarget.style.filter = 'brightness(0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    Add Schedule for {unscheduledDays.length === 1 ? 'This Day' : 'These Days'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowUnscheduledPrompt(false);
                    completeSave();
                  }}
                  className="w-full px-4 py-3 border-2 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                  style={{
                    borderColor: daypartColor ? `${daypartColor}40` : '#cbd5e1'
                  }}
                >
                  {onScheduleUnscheduledDays ? 'Skip for Now' : 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
