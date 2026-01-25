import { useState } from 'react';
import { ArrowLeft, Clock, AlertCircle, Calendar, Sparkles, Info, Trash2 } from 'lucide-react';
import TimeSelector from '../components/TimeSelector';
import DaySelector from '../components/DaySelector';
import HolidayTemplatePicker from '../components/HolidayTemplatePicker';
import { useScheduleCollisionDetection, Schedule } from '../hooks/useScheduleCollisionDetection';
import { ScheduleType, RecurrenceType, RecurrenceConfig, getPriorityLevel, formatRecurrenceText } from '../types/schedules';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string;
  sort_order: number;
}

interface ScheduleEditPageProps {
  schedule: Schedule;
  allSchedules: Schedule[];
  daypartDefinitions: DaypartDefinition[];
  placementName: string;
  isInheritedEdit: boolean;
  onSave: (schedule: Schedule) => Promise<void>;
  onDelete?: (scheduleId: string) => Promise<void>;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
  { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' }
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleEditPage({
  schedule,
  allSchedules,
  daypartDefinitions,
  placementName,
  isInheritedEdit,
  onSave,
  onDelete,
  onCancel
}: ScheduleEditPageProps) {
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [scheduleName, setScheduleName] = useState(schedule.schedule_name || '');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const scheduleType = schedule.schedule_type || 'regular';
  const [eventName, setEventName] = useState(schedule.event_name || '');
  const [eventDate, setEventDate] = useState(schedule.event_date || '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(schedule.recurrence_type || 'none');
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>(schedule.recurrence_config || {});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentDaypart = daypartDefinitions.find(d => d.id === localSchedule.daypart_definition_id);
  const daypartName = currentDaypart?.daypart_name || localSchedule.daypart_name || '';

  const collision = useScheduleCollisionDetection(
    allSchedules,
    daypartName,
    localSchedule.days_of_week,
    localSchedule.id,
    scheduleType
  );

  const handleToggleDay = (day: number) => {
    const newDays = localSchedule.days_of_week.includes(day)
      ? localSchedule.days_of_week.filter(d => d !== day)
      : [...localSchedule.days_of_week, day].sort();

    setLocalSchedule({ ...localSchedule, days_of_week: newDays });
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    setLocalSchedule({ ...localSchedule, [field]: value });
  };

  const handleDaypartChange = (daypartId: string) => {
    const daypart = daypartDefinitions.find(d => d.id === daypartId);
    if (daypart) {
      setLocalSchedule({
        ...localSchedule,
        daypart_definition_id: daypartId,
        daypart_name: daypart.daypart_name
      });
    }
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

  const handleSave = async () => {
    if (scheduleType === 'regular' && localSchedule.days_of_week.length === 0) {
      return;
    }
    if (scheduleType === 'event_holiday' && !eventName) {
      return;
    }
    if (collision.hasCollision) {
      return;
    }
    if (localSchedule.start_time === localSchedule.end_time) {
      alert('Start time and end time must be different');
      return;
    }

    const updatedSchedule: Schedule = {
      ...localSchedule,
      schedule_name: scheduleName || undefined,
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

    setIsSaving(true);
    try {
      await onSave(updatedSchedule);
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule. Please try again.');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule.id || !onDelete) return;

    setShowDeleteConfirm(false);
    setIsSaving(true);
    try {
      await onDelete(schedule.id);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule. Please try again.');
      setIsSaving(false);
    }
  };

  const daysError = scheduleType === 'regular' && localSchedule.days_of_week.length === 0
    ? 'Please select at least one day'
    : null;

  const eventNameError = scheduleType === 'event_holiday' && !eventName
    ? 'Event name is required'
    : null;

  const error = collision.collisionMessage || daysError || eventNameError;
  const isFormValid = !error && localSchedule.start_time !== localSchedule.end_time;

  const pageTitle = schedule.id ? 'Edit Schedule' : 'New Schedule';

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
              {pageTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 hidden md:block">
              {placementName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl px-4 md:px-6 lg:px-8 py-6 space-y-6">
          {isInheritedEdit && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium">Creating placement-level override</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    This will override the store-level schedule for this placement only.
                  </p>
                </div>
              </div>
            </div>
          )}

          {scheduleType === 'event_holiday' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-medium mb-1">Event schedules override all regular schedules</p>
                  <p className="text-amber-700 dark:text-amber-300">No collision checking needed for events and holidays</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Schedule Name <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="Enter schedule name..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Daypart Type
            </label>
            <select
              value={localSchedule.daypart_definition_id}
              onChange={(e) => handleDaypartChange(e.target.value)}
              disabled={!!schedule.id}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {daypartDefinitions.map((daypart) => (
                <option key={daypart.id} value={daypart.id}>
                  {daypart.display_label}
                </option>
              ))}
            </select>
            {schedule.id && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Daypart cannot be changed after creation
              </p>
            )}
          </div>

          {scheduleType === 'event_holiday' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6">
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(true)}
                  className="w-full px-4 py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Quick Add from Holiday Template
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Christmas Day, Holiday Season"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {eventNameError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{eventNameError}</p>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Recurrence Type
                  </label>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {recurrenceType === 'annual_date' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Month
                      </label>
                      <select
                        value={recurrenceConfig.month || ''}
                        onChange={(e) => handleRecurrenceConfigChange('month', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select month</option>
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={idx} value={idx + 1}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Day
                      </label>
                      <select
                        value={recurrenceConfig.day_of_month || ''}
                        onChange={(e) => handleRecurrenceConfigChange('day_of_month', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Day of Month
                    </label>
                    <select
                      value={recurrenceConfig.day_of_month || ''}
                      onChange={(e) => handleRecurrenceConfigChange('day_of_month', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {recurrenceType === 'annual_relative' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Position
                      </label>
                      <select
                        value={recurrenceConfig.position || ''}
                        onChange={(e) => handleRecurrenceConfigChange('position', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Weekday
                      </label>
                      <select
                        value={recurrenceConfig.weekday !== undefined ? recurrenceConfig.weekday : ''}
                        onChange={(e) => handleRecurrenceConfigChange('weekday', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select</option>
                        {DAY_NAMES.map((name, idx) => (
                          <option key={idx} value={idx}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Month
                      </label>
                      <select
                        value={recurrenceConfig.month || ''}
                        onChange={(e) => handleRecurrenceConfigChange('month', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={recurrenceConfig.range_start_date || ''}
                        onChange={(e) => handleRecurrenceConfigChange('range_start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={recurrenceConfig.range_end_date || ''}
                        onChange={(e) => handleRecurrenceConfigChange('range_end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {recurrenceType && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-amber-900 dark:text-amber-100">
                        {formatRecurrenceText(recurrenceType, recurrenceConfig, eventDate)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {scheduleType === 'regular' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Days of Week <span className="text-red-500">*</span>
              </label>
              <DaySelector
                selectedDays={localSchedule.days_of_week}
                onToggleDay={handleToggleDay}
                schedules={allSchedules}
                currentDaypartName={daypartName}
                editingScheduleId={localSchedule.id}
                showPresets={true}
              />
              {daysError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">{daysError}</p>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Start Time <span className="text-red-500">*</span>
              </label>
              <TimeSelector
                label=""
                value={localSchedule.start_time || '09:00'}
                onChange={(time) => handleTimeChange('start_time', time)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                End Time <span className="text-red-500">*</span>
              </label>
              <TimeSelector
                label=""
                value={localSchedule.end_time || '17:00'}
                onChange={(time) => handleTimeChange('end_time', time)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {schedule.id && onDelete && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="w-full px-4 py-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                Delete Schedule
              </button>
            </div>
          )}

          <div className="h-20" />
        </div>
      </div>

      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-lg sticky bottom-0">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            style={{ backgroundColor: '#00adf0' }}
            className="flex-1 px-4 py-3 text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            onMouseEnter={(e) => isFormValid && !isSaving && (e.currentTarget.style.backgroundColor = '#00c3ff')}
            onMouseLeave={(e) => isFormValid && !isSaving && (e.currentTarget.style.backgroundColor = '#00adf0')}
          >
            {isSaving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Delete Schedule?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this schedule? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
