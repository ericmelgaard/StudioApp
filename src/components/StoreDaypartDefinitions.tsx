import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Copy, AlertCircle, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_name: string;
  color: string;
  icon: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  sort_order: number;
  store_id: number | null;
  concept_id: number | null;
  source_level: 'store' | 'concept' | 'global';
  is_customized: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreDaypartDefinitionsProps {
  storeId: number;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export default function StoreDaypartDefinitions({ storeId }: StoreDaypartDefinitionsProps) {
  const [definitions, setDefinitions] = useState<DaypartDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<DaypartDefinition | null>(null);
  const [customizingDefinition, setCustomizingDefinition] = useState<DaypartDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    daypart_name: '',
    display_name: '',
    color: '#3b82f6',
    icon: 'Clock',
    start_time: '00:00',
    end_time: '23:59',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    sort_order: 0,
  });

  useEffect(() => {
    loadDefinitions();
  }, [storeId]);

  const loadDefinitions = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_effective_daypart_definitions', { p_store_id: storeId });

      if (fetchError) throw fetchError;

      setDefinitions(data || []);
    } catch (err: any) {
      console.error('Error loading definitions:', err);
      setError(err.message || 'Failed to load daypart definitions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      daypart_name: '',
      display_name: '',
      color: '#3b82f6',
      icon: 'Clock',
      start_time: '00:00',
      end_time: '23:59',
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      sort_order: definitions.length,
    });
    setEditingDefinition(null);
    setCustomizingDefinition(null);
    setShowForm(true);
  };

  const handleEdit = (definition: DaypartDefinition) => {
    setFormData({
      daypart_name: definition.daypart_name,
      display_name: definition.display_name,
      color: definition.color,
      icon: definition.icon,
      start_time: definition.start_time,
      end_time: definition.end_time,
      days_of_week: definition.days_of_week,
      sort_order: definition.sort_order,
    });
    setEditingDefinition(definition);
    setCustomizingDefinition(null);
    setShowForm(true);
  };

  const handleCustomize = (definition: DaypartDefinition) => {
    setFormData({
      daypart_name: definition.daypart_name,
      display_name: definition.display_name,
      color: definition.color,
      icon: definition.icon,
      start_time: definition.start_time,
      end_time: definition.end_time,
      days_of_week: definition.days_of_week,
      sort_order: definition.sort_order,
    });
    setCustomizingDefinition(definition);
    setEditingDefinition(null);
    setShowForm(true);
  };

  const convertDaysToIntegers = (days: string[]): number[] => {
    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
    };
    return days.map(day => dayMap[day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const daysAsIntegers = convertDaysToIntegers(formData.days_of_week);

      if (editingDefinition) {
        const { error: updateError } = await supabase
          .from('daypart_definitions')
          .update({
            display_label: formData.display_name,
            color: formData.color,
            icon: formData.icon,
            default_start_time: formData.start_time,
            default_end_time: formData.end_time,
            default_days: daysAsIntegers,
            sort_order: formData.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDefinition.id);

        if (updateError) throw updateError;
        setSuccess('Daypart definition updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('daypart_definitions')
          .insert([{
            daypart_name: formData.daypart_name,
            display_label: formData.display_name,
            color: formData.color,
            icon: formData.icon,
            default_start_time: formData.start_time,
            default_end_time: formData.end_time,
            default_days: daysAsIntegers,
            sort_order: formData.sort_order,
            is_active: true,
            store_id: storeId,
            concept_id: null,
          }]);

        if (insertError) throw insertError;
        setSuccess(customizingDefinition
          ? 'Daypart definition customized successfully'
          : 'Daypart definition created successfully');
      }

      setShowForm(false);
      setEditingDefinition(null);
      setCustomizingDefinition(null);
      await loadDefinitions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving definition:', err);
      setError(err.message || 'Failed to save daypart definition');
    }
  };

  const handleDelete = async (definition: DaypartDefinition) => {
    if (!definition.is_customized) {
      setError('Cannot delete inherited definitions. You can only delete store-specific definitions.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${definition.display_name}" daypart definition?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('daypart_definitions')
        .delete()
        .eq('id', definition.id);

      if (deleteError) throw deleteError;

      setSuccess('Daypart definition deleted successfully');
      await loadDefinitions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting definition:', err);
      setError(err.message || 'Failed to delete daypart definition');
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Daypart Definitions</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddNew();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Definition
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-2">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {definitions.map((definition) => (
          <div
            key={definition.id}
            className={`p-4 border rounded-lg transition-all ${
              definition.is_customized
                ? 'border-blue-200 bg-blue-50/50'
                : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: definition.color }}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900">{definition.display_name}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        definition.source_level === 'store'
                          ? 'bg-blue-100 text-blue-700'
                          : definition.source_level === 'concept'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {definition.source_level === 'store'
                        ? 'Store'
                        : definition.source_level === 'concept'
                        ? 'Concept'
                        : 'Global'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div>
                      <span className="font-medium">Time:</span> {definition.start_time} - {definition.end_time}
                    </div>
                    <div>
                      <span className="font-medium">Days:</span>{' '}
                      {definition.days_of_week.length === 7
                        ? 'Every day'
                        : definition.days_of_week.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {definition.is_customized ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(definition);
                      }}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(definition);
                      }}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomize(definition);
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    title="Customize for this store"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Customize
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {definitions.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No daypart definitions yet. Add your first definition to get started.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditingDefinition(null);
              setCustomizingDefinition(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingDefinition
                  ? 'Edit Daypart Definition'
                  : customizingDefinition
                  ? 'Customize Daypart Definition'
                  : 'Add Daypart Definition'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDefinition(null);
                  setCustomizingDefinition(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {customizingDefinition && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <strong>Customizing inherited definition:</strong> This will create a store-specific version
                  that overrides the {customizingDefinition.source_level} definition.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Daypart Name (Internal ID) *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingDefinition}
                  value={formData.daypart_name}
                  onChange={(e) => setFormData({ ...formData, daypart_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="e.g., breakfast, lunch, dinner"
                />
                {!editingDefinition && (
                  <p className="text-xs text-slate-500 mt-1">
                    Lowercase, no spaces. Used internally for matching with routines.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Breakfast"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                  <ColorPicker
                    color={formData.color}
                    onChange={(color) => setFormData({ ...formData, color })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
                  <IconPicker
                    selectedIcon={formData.icon}
                    onSelect={(icon) => setFormData({ ...formData, icon })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Days of Week *
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.days_of_week.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {formData.days_of_week.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">At least one day must be selected</p>
                )}
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
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Lower numbers appear first in lists
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDefinition(null);
                    setCustomizingDefinition(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.days_of_week.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingDefinition ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
