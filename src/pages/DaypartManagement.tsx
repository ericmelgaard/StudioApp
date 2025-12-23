import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Save, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string;
  color: string;
  default_start_time: string;
  default_end_time: string;
  default_days: number[];
  icon: string;
  sort_order: number;
  is_active: boolean;
  concept_id: number | null;
  created_at: string;
  updated_at: string;
}

interface DayConfiguration {
  id?: string;
  daypart_definition_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
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

const COLOR_OPTIONS = [
  { value: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Amber' },
  { value: 'bg-green-100 text-green-800 border-green-300', label: 'Green' },
  { value: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Blue' },
  { value: 'bg-violet-100 text-violet-800 border-violet-300', label: 'Violet' },
  { value: 'bg-slate-100 text-slate-800 border-slate-300', label: 'Slate' },
  { value: 'bg-red-100 text-red-800 border-red-300', label: 'Red' },
  { value: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Orange' },
  { value: 'bg-teal-100 text-teal-800 border-teal-300', label: 'Teal' },
];

interface EditFormProps {
  formData: Partial<DaypartDefinition>;
  setFormData: (data: Partial<DaypartDefinition>) => void;
  dayConfigurations: DayConfiguration[];
  showDayConfigs: boolean;
  setShowDayConfigs: (show: boolean) => void;
  toggleDay: (day: number) => void;
  addDayConfiguration: (day: number) => void;
  removeDayConfiguration: (day: number) => void;
  updateDayConfiguration: (day: number, field: 'start_time' | 'end_time', value: string) => void;
  getDayConfiguration: (day: number) => DayConfiguration | undefined;
  onSave: () => void;
  onCancel: () => void;
}

function EditForm({
  formData,
  setFormData,
  dayConfigurations,
  showDayConfigs,
  setShowDayConfigs,
  toggleDay,
  addDayConfiguration,
  removeDayConfiguration,
  updateDayConfiguration,
  getDayConfiguration,
  onSave,
  onCancel
}: EditFormProps) {
  return (
    <div className="px-6 py-4 bg-white border-t border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Daypart Name (System ID) *
          </label>
          <input
            type="text"
            value={formData.daypart_name}
            onChange={(e) => setFormData({ ...formData, daypart_name: e.target.value })}
            placeholder="e.g., breakfast"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Display Label *
          </label>
          <input
            type="text"
            value={formData.display_label}
            onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
            placeholder="e.g., Breakfast"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this daypart"
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Color Theme
          </label>
          <select
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {COLOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Sort Order
          </label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Default Start Time
          </label>
          <input
            type="time"
            value={formData.default_start_time}
            onChange={(e) => setFormData({ ...formData, default_start_time: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Default End Time
          </label>
          <input
            type="time"
            value={formData.default_end_time}
            onChange={(e) => setFormData({ ...formData, default_end_time: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Default Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (formData.default_days || []).includes(day.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {day.short}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setShowDayConfigs(!showDayConfigs)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            {showDayConfigs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Day-Specific Time Configurations (Optional)
          </button>
          <p className="text-xs text-slate-500 mt-1">
            Override default times for specific days. Days without custom times will use the default times above.
          </p>

          {showDayConfigs && (
            <div className="mt-4 space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const config = getDayConfiguration(day.value);
                const hasConfig = !!config;

                return (
                  <div
                    key={day.value}
                    className={`p-3 rounded-lg border ${
                      hasConfig ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{day.label}</span>
                      {hasConfig ? (
                        <button
                          type="button"
                          onClick={() => removeDayConfiguration(day.value)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove Override
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addDayConfiguration(day.value)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Add Custom Times
                        </button>
                      )}
                    </div>

                    {hasConfig && config && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={config.start_time}
                            onChange={(e) => updateDayConfiguration(day.value, 'start_time', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">End Time</label>
                          <input
                            type="time"
                            value={config.end_time}
                            onChange={(e) => updateDayConfiguration(day.value, 'end_time', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {!hasConfig && (
                      <div className="text-xs text-slate-500">
                        Using default: {formData.default_start_time} - {formData.default_end_time}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

function DaypartCard({
  daypart,
  onEdit,
  onDelete,
  isEditing,
  onSave,
  onCancel,
  formData,
  setFormData,
  dayConfigurations,
  showDayConfigs,
  setShowDayConfigs,
  toggleDay,
  addDayConfiguration,
  removeDayConfiguration,
  updateDayConfiguration,
  getDayConfiguration
}: {
  daypart: DaypartDefinition;
  onEdit: (daypart: DaypartDefinition) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  formData?: Partial<DaypartDefinition>;
  setFormData?: (data: Partial<DaypartDefinition>) => void;
  dayConfigurations?: DayConfiguration[];
  showDayConfigs?: boolean;
  setShowDayConfigs?: (show: boolean) => void;
  toggleDay?: (day: number) => void;
  addDayConfiguration?: (day: number) => void;
  removeDayConfiguration?: (day: number) => void;
  updateDayConfiguration?: (day: number, field: 'start_time' | 'end_time', value: string) => void;
  getDayConfiguration?: (day: number) => DayConfiguration | undefined;
}) {
  const [dayConfigs, setDayConfigs] = useState<DayConfiguration[]>([]);
  const [showConfigs, setShowConfigs] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadConfigs = async () => {
    if (dayConfigs.length > 0) return;

    setLoading(true);
    const { data } = await supabase
      .from('daypart_day_configurations')
      .select('*')
      .eq('daypart_definition_id', daypart.id)
      .order('day_of_week');

    setDayConfigs(data || []);
    setLoading(false);
  };

  const toggleConfigs = () => {
    if (!showConfigs && dayConfigs.length === 0) {
      loadConfigs();
    }
    setShowConfigs(!showConfigs);
  };

  const getDayConfig = (day: number) => dayConfigs.find(c => c.day_of_week === day);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className={`px-6 py-4 ${isEditing ? '' : 'border-b border-slate-200'} ${daypart.color}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {daypart.display_label}
              {!daypart.is_active && (
                <span className="text-xs px-2 py-1 bg-white/50 rounded">Inactive</span>
              )}
              {isEditing && (
                <span className="text-xs px-2 py-1 bg-white/50 rounded font-medium">Editing</span>
              )}
            </h3>
            <p className="text-sm opacity-90 mt-1">{daypart.description}</p>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(daypart)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Edit daypart"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(daypart.id)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Delete daypart"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing && formData && setFormData && dayConfigurations && showDayConfigs !== undefined && setShowDayConfigs && toggleDay && addDayConfiguration && removeDayConfiguration && updateDayConfiguration && getDayConfiguration ? (
        <EditForm
          formData={formData}
          setFormData={setFormData}
          dayConfigurations={dayConfigurations}
          showDayConfigs={showDayConfigs}
          setShowDayConfigs={setShowDayConfigs}
          toggleDay={toggleDay}
          addDayConfiguration={addDayConfiguration}
          removeDayConfiguration={removeDayConfiguration}
          updateDayConfiguration={updateDayConfiguration}
          getDayConfiguration={getDayConfiguration}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : !isEditing ? (
        <div className="px-6 py-4 bg-slate-50">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-700">System ID:</span>{' '}
              <span className="text-slate-600">{daypart.daypart_name}</span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Default Time:</span>{' '}
              <span className="text-slate-600">
                {daypart.default_start_time} - {daypart.default_end_time}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Sort Order:</span>{' '}
              <span className="text-slate-600">{daypart.sort_order}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="font-medium text-slate-700 text-sm">Default Days: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {daypart.default_days.sort().map((day) => {
                const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                return (
                  <span
                    key={day}
                    className="px-2 py-1 bg-white text-slate-600 text-xs rounded border border-slate-200"
                  >
                    {dayInfo?.short}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={toggleConfigs}
              className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {showConfigs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Day-Specific Configurations
            </button>

            {showConfigs && (
              <div className="mt-2">
                {loading ? (
                  <div className="text-xs text-slate-500">Loading...</div>
                ) : dayConfigs.length > 0 ? (
                  <div className="space-y-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const config = getDayConfig(day.value);
                      if (!config) return null;

                      return (
                        <div key={day.value} className="flex items-center justify-between text-xs py-1">
                          <span className="font-medium text-slate-700">{day.label}:</span>
                          <span className="text-slate-600">
                            {config.start_time} - {config.end_time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No day-specific configurations</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DaypartManagement() {
  const [dayparts, setDayparts] = useState<DaypartDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDayConfigs, setShowDayConfigs] = useState(false);
  const [dayConfigurations, setDayConfigurations] = useState<DayConfiguration[]>([]);
  const [formData, setFormData] = useState<Partial<DaypartDefinition>>({
    daypart_name: '',
    display_label: '',
    description: '',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    default_start_time: '06:00:00',
    default_end_time: '11:00:00',
    default_days: [1, 2, 3, 4, 5, 6, 0],
    icon: 'Clock',
    sort_order: 0,
    is_active: true,
    concept_id: null
  });

  useEffect(() => {
    loadDayparts();
  }, []);

  const loadDayparts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error loading dayparts:', error);
      setError('Failed to load dayparts');
    } else {
      setDayparts(data || []);
    }
    setLoading(false);
  };

  const loadDayConfigurations = async (daypartId: string) => {
    const { data, error } = await supabase
      .from('daypart_day_configurations')
      .select('*')
      .eq('daypart_definition_id', daypartId)
      .order('day_of_week');

    if (error) {
      console.error('Error loading day configurations:', error);
      return [];
    }
    return data || [];
  };

  const handleSave = async () => {
    if (!formData.daypart_name || !formData.display_label) {
      setError('Daypart name and display label are required');
      return;
    }

    try {
      let daypartId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('daypart_definitions')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('daypart_definitions')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        daypartId = data.id;
      }

      if (daypartId) {
        await saveDayConfigurations(daypartId);
      }

      setEditingId(null);
      setShowAddForm(false);
      setShowDayConfigs(false);
      setDayConfigurations([]);
      setFormData({
        daypart_name: '',
        display_label: '',
        description: '',
        color: 'bg-slate-100 text-slate-800 border-slate-300',
        default_start_time: '06:00:00',
        default_end_time: '11:00:00',
        default_days: [1, 2, 3, 4, 5, 6, 0],
        icon: 'Clock',
        sort_order: 0,
        is_active: true,
        concept_id: null
      });
      setError(null);
      await loadDayparts();
    } catch (err: any) {
      setError(err.message || 'Failed to save daypart');
    }
  };

  const saveDayConfigurations = async (daypartId: string) => {
    const existingConfigs = await loadDayConfigurations(daypartId);
    const existingConfigIds = existingConfigs.map(c => c.id);

    const configurationsToKeep = dayConfigurations.filter(dc => dc.id);
    const configurationsToAdd = dayConfigurations.filter(dc => !dc.id);

    const configIdsToKeep = configurationsToKeep.map(c => c.id);
    const configsToDelete = existingConfigIds.filter(id => !configIdsToKeep.includes(id));

    if (configsToDelete.length > 0) {
      await supabase
        .from('daypart_day_configurations')
        .delete()
        .in('id', configsToDelete);
    }

    for (const config of configurationsToKeep) {
      if (config.id) {
        await supabase
          .from('daypart_day_configurations')
          .update({
            start_time: config.start_time,
            end_time: config.end_time
          })
          .eq('id', config.id);
      }
    }

    if (configurationsToAdd.length > 0) {
      await supabase
        .from('daypart_day_configurations')
        .insert(configurationsToAdd.map(c => ({
          daypart_definition_id: daypartId,
          day_of_week: c.day_of_week,
          start_time: c.start_time,
          end_time: c.end_time
        })));
    }
  };

  const handleEdit = async (daypart: DaypartDefinition) => {
    setEditingId(daypart.id);
    setFormData(daypart);
    setShowAddForm(false);
    const configs = await loadDayConfigurations(daypart.id);
    setDayConfigurations(configs);
  };

  const addDayConfiguration = (day: number) => {
    if (dayConfigurations.some(dc => dc.day_of_week === day)) {
      return;
    }

    setDayConfigurations([
      ...dayConfigurations,
      {
        daypart_definition_id: editingId || '',
        day_of_week: day,
        start_time: formData.default_start_time || '06:00:00',
        end_time: formData.default_end_time || '11:00:00'
      }
    ]);
  };

  const removeDayConfiguration = (day: number) => {
    setDayConfigurations(dayConfigurations.filter(dc => dc.day_of_week !== day));
  };

  const updateDayConfiguration = (day: number, field: 'start_time' | 'end_time', value: string) => {
    setDayConfigurations(
      dayConfigurations.map(dc =>
        dc.day_of_week === day ? { ...dc, [field]: value } : dc
      )
    );
  };

  const getDayConfiguration = (day: number) => {
    return dayConfigurations.find(dc => dc.day_of_week === day);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this daypart definition?')) {
      return;
    }

    const { error } = await supabase
      .from('daypart_definitions')
      .delete()
      .eq('id', id);

    if (error) {
      setError('Failed to delete daypart');
    } else {
      await loadDayparts();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setShowDayConfigs(false);
    setDayConfigurations([]);
    setFormData({
      daypart_name: '',
      display_label: '',
      description: '',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      default_start_time: '06:00:00',
      default_end_time: '11:00:00',
      default_days: [1, 2, 3, 4, 5, 6, 0],
      icon: 'Clock',
      sort_order: 0,
      is_active: true,
      concept_id: null
    });
    setError(null);
  };

  const toggleDay = (day: number) => {
    const current = formData.default_days || [];
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    setFormData({ ...formData, default_days: newDays });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Global Daypart Definitions</h1>
        <p className="text-slate-600">
          Define global daypart types that can be used across all sites for configuring daypart routines.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showAddForm && !editingId && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Add New Daypart
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Daypart Name (System ID) *
              </label>
              <input
                type="text"
                value={formData.daypart_name}
                onChange={(e) => setFormData({ ...formData, daypart_name: e.target.value })}
                placeholder="e.g., breakfast"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Label *
              </label>
              <input
                type="text"
                value={formData.display_label}
                onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                placeholder="e.g., Breakfast"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this daypart"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Color Theme
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Start Time
              </label>
              <input
                type="time"
                value={formData.default_start_time}
                onChange={(e) => setFormData({ ...formData, default_start_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default End Time
              </label>
              <input
                type="time"
                value={formData.default_end_time}
                onChange={(e) => setFormData({ ...formData, default_end_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (formData.default_days || []).includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowDayConfigs(!showDayConfigs)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                {showDayConfigs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Day-Specific Time Configurations (Optional)
              </button>
              <p className="text-xs text-slate-500 mt-1">
                Override default times for specific days. Days without custom times will use the default times above.
              </p>

              {showDayConfigs && (
                <div className="mt-4 space-y-3">
                  {DAYS_OF_WEEK.map((day) => {
                    const config = getDayConfiguration(day.value);
                    const hasConfig = !!config;

                    return (
                      <div
                        key={day.value}
                        className={`p-3 rounded-lg border ${
                          hasConfig ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{day.label}</span>
                          {hasConfig ? (
                            <button
                              type="button"
                              onClick={() => removeDayConfiguration(day.value)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove Override
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addDayConfiguration(day.value)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Add Custom Times
                            </button>
                          )}
                        </div>

                        {hasConfig && config && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Start Time</label>
                              <input
                                type="time"
                                value={config.start_time}
                                onChange={(e) => updateDayConfiguration(day.value, 'start_time', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">End Time</label>
                              <input
                                type="time"
                                value={config.end_time}
                                onChange={(e) => updateDayConfiguration(day.value, 'end_time', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        )}

                        {!hasConfig && (
                          <div className="text-xs text-slate-500">
                            Using default: {formData.default_start_time} - {formData.default_end_time}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAddForm && !editingId && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Daypart
        </button>
      )}

      <div className="space-y-4">
        {dayparts.map((daypart) => (
          <DaypartCard
            key={daypart.id}
            daypart={daypart}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isEditing={editingId === daypart.id}
            onSave={handleSave}
            onCancel={handleCancel}
            formData={editingId === daypart.id ? formData : undefined}
            setFormData={editingId === daypart.id ? setFormData : undefined}
            dayConfigurations={editingId === daypart.id ? dayConfigurations : undefined}
            showDayConfigs={editingId === daypart.id ? showDayConfigs : undefined}
            setShowDayConfigs={editingId === daypart.id ? setShowDayConfigs : undefined}
            toggleDay={editingId === daypart.id ? toggleDay : undefined}
            addDayConfiguration={editingId === daypart.id ? addDayConfiguration : undefined}
            removeDayConfiguration={editingId === daypart.id ? removeDayConfiguration : undefined}
            updateDayConfiguration={editingId === daypart.id ? updateDayConfiguration : undefined}
            getDayConfiguration={editingId === daypart.id ? getDayConfiguration : undefined}
          />
        ))}
      </div>

      {dayparts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Dayparts Defined</h3>
          <p className="text-slate-600 text-sm mb-4">Get started by adding your first daypart definition.</p>
        </div>
      )}
    </div>
  );
}
