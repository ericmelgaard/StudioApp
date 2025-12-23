import { useState, useEffect } from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import TimeSelector from './TimeSelector';
import { supabase } from '../lib/supabase';
import HolidayTemplatePicker from './HolidayTemplatePicker';

interface DaypartRoutineFormProps {
  placementGroupId: string;
  existingRoutines: DaypartRoutine[];
  onSave: (routine: Omit<DaypartRoutine, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  editingRoutine?: DaypartRoutine | null;
  preFillDaypart?: string;
}

export interface DaypartRoutine {
  id?: string;
  placement_group_id: string;
  daypart_name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  schedule_type?: 'regular' | 'event_holiday';
  event_name?: string;
  event_date?: string;
  recurrence_type?: 'none' | 'annual_date' | 'monthly_date' | 'annual_relative' | 'annual_date_range';
  recurrence_config?: {
    month?: number;
    day_of_month?: number;
    weekday?: number;
    position?: number;
    range_start_date?: string;
    range_end_date?: string;
  };
  priority_level?: number;
  created_at?: string;
  updated_at?: string;
}

interface DaypartDefinition {
  daypart_name: string;
  display_label: string;
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

export default function DaypartRoutineForm({
  placementGroupId,
  existingRoutines,
  onSave,
  onCancel,
  editingRoutine,
  preFillDaypart
}: DaypartRoutineFormProps) {
  const [daypartTypes, setDaypartTypes] = useState<DaypartDefinition[]>([]);
  const [formData, setFormData] = useState({
    schedule_type: editingRoutine?.schedule_type || 'regular' as 'regular' | 'event_holiday',
    daypart_name: editingRoutine?.daypart_name || preFillDaypart || '',
    days_of_week: editingRoutine?.days_of_week || [] as number[],
    start_time: editingRoutine?.start_time || '06:00',
    end_time: editingRoutine?.end_time || '11:00',
    event_name: editingRoutine?.event_name || '',
    event_date: editingRoutine?.event_date || '',
    recurrence_type: editingRoutine?.recurrence_type || 'none' as 'none' | 'annual_date' | 'monthly_date' | 'annual_relative' | 'annual_date_range',
    recurrence_config: editingRoutine?.recurrence_config || {}
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDaypartTypes();
  }, []);

  const loadDaypartTypes = async () => {
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('daypart_name, display_label')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error loading daypart types:', error);
    } else {
      setDaypartTypes(data || []);
    }
  };

  const checkCollision = (daypartName: string, selectedDays: number[]): string | null => {
    if (!daypartName || selectedDays.length === 0) {
      return null;
    }

    const conflictingRoutines = existingRoutines.filter(routine => {
      if (editingRoutine && routine.id === editingRoutine.id) return false;
      if (routine.daypart_name !== daypartName) return false;
      return routine.days_of_week.some(day => selectedDays.includes(day));
    });

    if (conflictingRoutines.length > 0) {
      const conflictingDays = conflictingRoutines
        .flatMap(r => r.days_of_week)
        .filter(day => selectedDays.includes(day))
        .filter((day, index, self) => self.indexOf(day) === index)
        .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label)
        .join(', ');
      return `This daypart already has routines on: ${conflictingDays}`;
    }
    return null;
  };

  const toggleDay = (day: number) => {
    const newDays = formData.days_of_week.includes(day)
      ? formData.days_of_week.filter(d => d !== day)
      : [...formData.days_of_week, day].sort();

    setFormData({ ...formData, days_of_week: newDays });

    const collision = checkCollision(formData.daypart_name, newDays);
    setError(collision);
  };

  const selectAllDays = () => {
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    setFormData({ ...formData, days_of_week: allDays });
    const collision = checkCollision(formData.daypart_name, allDays);
    setError(collision);
  };

  const clearAllDays = () => {
    setFormData({ ...formData, days_of_week: [] });
    setError(null);
  };

  const handleDaypartChange = (daypartName: string) => {
    setFormData({ ...formData, daypart_name: daypartName });

    const collision = checkCollision(daypartName, formData.days_of_week);
    setError(collision);
  };

  const getDayCollisionStatus = (day: number): boolean => {
    if (!formData.daypart_name || formData.days_of_week.includes(day)) return false;
    return existingRoutines.some(routine => {
      if (editingRoutine && routine.id === editingRoutine.id) return false;
      return routine.daypart_name === formData.daypart_name && routine.days_of_week.includes(day);
    });
  };

  const calculatePriorityLevel = (): number => {
    if (formData.schedule_type === 'regular') return 10;
    if (formData.recurrence_type === 'none') return 100;
    if (formData.recurrence_type === 'annual_date_range') return 50;
    return 100;
  };

  const handleSubmit = async () => {
    if (!formData.daypart_name) {
      setError('Please select a daypart type');
      return;
    }

    if (formData.schedule_type === 'event_holiday') {
      if (!formData.event_name?.trim()) {
        setError('Please enter an event name');
        return;
      }
      if (!formData.event_date) {
        setError('Please select an event date');
        return;
      }
    }

    if (formData.days_of_week.length === 0) {
      setError('Please select at least one day');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setError('End time must be after start time');
      return;
    }

    const collision = checkCollision(formData.daypart_name, formData.days_of_week);
    if (collision) {
      setError(collision);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const priority_level = calculatePriorityLevel();
      await onSave({
        placement_group_id: placementGroupId,
        ...formData,
        priority_level,
        recurrence_config: Object.keys(formData.recurrence_config).length > 0 ? formData.recurrence_config : undefined
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save daypart routine');
      setSaving(false);
    }
  };

  const handleTemplateApply = (template: any) => {
    setFormData({
      ...formData,
      event_name: template.name,
      event_date: template.date || '',
      recurrence_type: template.recurrenceType || 'none',
      recurrence_config: template.recurrenceConfig || {}
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-900">
          {editingRoutine ? 'Edit Schedule' : 'New Schedule'}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Schedule Type *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, schedule_type: 'regular' })}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                formData.schedule_type === 'regular'
                  ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              Regular Schedule
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, schedule_type: 'event_holiday' })}
              className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                formData.schedule_type === 'event_holiday'
                  ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Event/Holiday
            </button>
          </div>
        </div>

        {formData.schedule_type === 'event_holiday' && (
          <>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-900">Quick Fill from Template</p>
              </div>
              <HolidayTemplatePicker onSelectTemplate={handleTemplateApply} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                placeholder="e.g., Christmas, New Year's Eve, Super Bowl Sunday"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Event Date *
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Recurrence *
              </label>
              <select
                value={formData.recurrence_type}
                onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="none">One-time event</option>
                <option value="annual_date">Annual (same date every year)</option>
                <option value="monthly_date">Monthly (same day each month)</option>
                <option value="annual_relative">Annual (relative day, e.g., last Monday of May)</option>
                <option value="annual_date_range">Annual date range (multi-week event)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {formData.recurrence_type === 'none' && 'Event occurs only once on the specified date'}
                {formData.recurrence_type === 'annual_date' && 'Event repeats on the same date every year'}
                {formData.recurrence_type === 'monthly_date' && 'Event repeats on the same day every month'}
                {formData.recurrence_type === 'annual_relative' && 'Event repeats on a relative weekday (e.g., 3rd Thursday)'}
                {formData.recurrence_type === 'annual_date_range' && 'Event spans multiple weeks, repeating annually'}
              </p>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Daypart Type *
          </label>
          <select
            value={formData.daypart_name}
            onChange={(e) => handleDaypartChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            required
          >
            <option value="">Select a daypart...</option>
            {daypartTypes.map((type) => (
              <option key={type.daypart_name} value={type.daypart_name}>
                {type.display_label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-700">Days of the Week *</label>
            <button
              type="button"
              onClick={formData.days_of_week.length === 7 ? clearAllDays : selectAllDays}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              {formData.days_of_week.length === 7 ? 'Clear All' : 'Select All'}
            </button>
          </div>
          <div className="text-xs text-slate-500 mb-3">
            Click days to enable. Red border indicates collision with existing routine.
          </div>
          <div className="flex justify-between gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = formData.days_of_week.includes(day.value);
              const hasCollision = getDayCollisionStatus(day.value);

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`flex-1 h-12 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  } ${hasCollision && !isSelected ? 'ring-2 ring-red-400' : ''}`}
                  title={hasCollision && !isSelected ? `${day.label} already used by another ${formData.daypart_name} routine` : day.label}
                >
                  <div className="text-xs">{day.short}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TimeSelector
            label="Start Time *"
            value={formData.start_time}
            onChange={(time) => setFormData({ ...formData, start_time: time })}
          />
          <TimeSelector
            label="End Time *"
            value={formData.end_time}
            onChange={(time) => setFormData({ ...formData, end_time: time })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !!error || !formData.daypart_name || formData.days_of_week.length === 0}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
              formData.schedule_type === 'event_holiday'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {saving ? 'Saving...' : editingRoutine ? 'Update Schedule' : 'Add Schedule'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
