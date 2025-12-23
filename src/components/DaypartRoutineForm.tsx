import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import TimeSelector from './TimeSelector';
import { supabase } from '../lib/supabase';

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
    daypart_name: editingRoutine?.daypart_name || preFillDaypart || '',
    days_of_week: editingRoutine?.days_of_week || [] as number[],
    start_time: editingRoutine?.start_time || '06:00',
    end_time: editingRoutine?.end_time || '11:00'
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

  const handleSubmit = async () => {
    if (!formData.daypart_name) {
      setError('Please select a daypart type');
      return;
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
      await onSave({
        placement_group_id: placementGroupId,
        ...formData
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save daypart routine');
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-900">
          {editingRoutine ? 'Edit Daypart Routine' : 'New Daypart Routine'}
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
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Saving...' : editingRoutine ? 'Update Routine' : 'Add Routine'}
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
