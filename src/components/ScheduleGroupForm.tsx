import { useState } from 'react';
import { AlertCircle, Calendar, Sparkles, Info } from 'lucide-react';
import TimeSelector from './TimeSelector';
import DaySelector from './DaySelector';
import HolidayTemplatePicker from './HolidayTemplatePicker';
import { useScheduleCollisionDetection, Schedule } from '../hooks/useScheduleCollisionDetection';
import { ScheduleType, RecurrenceType, RecurrenceConfig, DayPosition, getPriorityLevel, formatRecurrenceText } from '../types/schedules';

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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(schedule.schedule_type || 'regular');
  const [scheduleName, setScheduleName] = useState(schedule.schedule_name || '');
  const [eventName, setEventName] = useState(schedule.event_name || '');
  const [eventDate, setEventDate] = useState(schedule.event_date || '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(schedule.recurrence_type || 'none');
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>(schedule.recurrence_config || {});

  const collision = useScheduleCollisionDetection(
    allSchedules,
    localSchedule.daypart_name,
    localSchedule.days_of_week,
    localSchedule.id,
    scheduleType
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

  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    if (type === 'regular') {
      setEventName('');
      setEventDate('');
      setRecurrenceType('none');
      setRecurrenceConfig({});
    }
  };

  const handleTemplateSelect = (templates: any[]) => {
    if (templates.length > 0) {
      const template = templates[0];
      setEventName(template.name);
      setRecurrenceType(template.recurrence_type);
      setRecurrenceConfig(template.recurrence_config);
      if (template.suggested_hours) {
        handleTimeChange('start_time', template.suggested_hours.start_time);
        handleTimeChange('end_time', template.suggested_hours.end_time);
      }
    }
    setShowTemplatePicker(false);
  };

  const handleRecurrenceConfigChange = (field: string, value: any) => {
    setRecurrenceConfig({ ...recurrenceConfig, [field]: value });
  };

  const handleSave = () => {
    if (scheduleType === 'regular') {
      if (localSchedule.days_of_week.length === 0) {
        return;
      }
    }
    if (scheduleType === 'event_holiday' && !eventName) {
      return;
    }
    if (localSchedule.start_time >= localSchedule.end_time) {
      return;
    }
    if (collision.hasCollision) {
      return;
    }

    const updatedSchedule: Schedule = {
      ...localSchedule,
      schedule_type: scheduleType,
      schedule_name: scheduleName || undefined,
      priority_level: scheduleType === 'event_holiday' ? getPriorityLevel(recurrenceType) : 10
    };

    if (scheduleType === 'event_holiday') {
      updatedSchedule.event_name = eventName;
      updatedSchedule.event_date = eventDate || undefined;
      updatedSchedule.recurrence_type = recurrenceType;
      updatedSchedule.recurrence_config = recurrenceConfig;
    }

    onUpdate(updatedSchedule);
    onSave();
  };

  const timeError = localSchedule.start_time >= localSchedule.end_time
    ? 'End time must be after start time'
    : null;

  const daysError = scheduleType === 'regular' && localSchedule.days_of_week.length === 0
    ? 'Please select at least one day'
    : null;

  const eventNameError = scheduleType === 'event_holiday' && !eventName
    ? 'Event name is required'
    : null;

  const error = collision.collisionMessage || timeError || daysError || eventNameError;

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleScheduleTypeChange('regular')}
          disabled={!!schedule.id}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            scheduleType === 'regular'
              ? 'bg-slate-700 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          } ${schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Regular Schedule
        </button>
        <button
          type="button"
          onClick={() => handleScheduleTypeChange('event_holiday')}
          disabled={!!schedule.id}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            scheduleType === 'event_holiday'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          } ${schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Event / Holiday
        </button>
      </div>

      {scheduleType === 'event_holiday' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Event schedules override all regular schedules</p>
            <p className="text-blue-700">No collision checking needed for events and holidays</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Schedule Name (optional)
        </label>
        <input
          type="text"
          value={scheduleName}
          onChange={(e) => setScheduleName(e.target.value)}
          placeholder="e.g., Weekend Hours, Summer Schedule"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

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
          type="button"
          onClick={handleSave}
          disabled={!!error}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          Save Schedule
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
        >
          Cancel
        </button>
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
