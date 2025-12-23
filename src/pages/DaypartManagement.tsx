import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, AlertCircle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconPicker from '../components/IconPicker';
import ScheduleGroupCard from '../components/ScheduleGroupCard';
import ScheduleGroupForm from '../components/ScheduleGroupForm';
import { Schedule } from '../hooks/useScheduleCollisionDetection';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  concept_id: number | null;
}

interface DaypartSchedule extends Schedule {
  daypart_definition_id: string;
}

export default function DaypartManagement() {
  const [definitions, setDefinitions] = useState<DaypartDefinition[]>([]);
  const [schedules, setSchedules] = useState<DaypartSchedule[]>([]);
  const [expandedDefinitions, setExpandedDefinitions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<DaypartDefinition | null>(null);
  const [addingScheduleForDef, setAddingScheduleForDef] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DaypartSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    daypart_name: '',
    display_label: '',
    description: '',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'Clock',
    sort_order: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [defsResult, schedulesResult] = await Promise.all([
        supabase
          .from('daypart_definitions')
          .select('*')
          .is('store_id', null)
          .is('concept_id', null)
          .order('sort_order'),
        supabase.from('daypart_schedules').select('*')
      ]);

      if (defsResult.error) throw defsResult.error;
      if (schedulesResult.error) throw schedulesResult.error;

      setDefinitions(defsResult.data || []);
      setSchedules(schedulesResult.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load daypart data');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (defId: string) => {
    const newExpanded = new Set(expandedDefinitions);
    if (newExpanded.has(defId)) {
      newExpanded.delete(defId);
    } else {
      newExpanded.add(defId);
    }
    setExpandedDefinitions(newExpanded);
  };

  const handleAddDefinition = () => {
    setFormData({
      daypart_name: '',
      display_label: '',
      description: '',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: 'Clock',
      sort_order: definitions.length * 10,
    });
    setEditingDefinition(null);
    setShowDefinitionForm(true);
  };

  const handleEditDefinition = (definition: DaypartDefinition) => {
    setFormData({
      daypart_name: definition.daypart_name,
      display_label: definition.display_label,
      description: definition.description || '',
      color: definition.color,
      icon: definition.icon,
      sort_order: definition.sort_order,
    });
    setEditingDefinition(definition);
    setShowDefinitionForm(true);
  };

  const handleSubmitDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingDefinition) {
        const { error: updateError } = await supabase
          .from('daypart_definitions')
          .update({
            display_label: formData.display_label,
            description: formData.description,
            color: formData.color,
            icon: formData.icon,
            sort_order: formData.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDefinition.id);

        if (updateError) throw updateError;
        setSuccess('Daypart definition updated successfully');
      } else {
        const { data: newDef, error: insertError } = await supabase
          .from('daypart_definitions')
          .insert([{
            daypart_name: formData.daypart_name,
            display_label: formData.display_label,
            description: formData.description,
            color: formData.color,
            icon: formData.icon,
            sort_order: formData.sort_order,
            is_active: true,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setSuccess('Daypart definition created successfully');

        if (newDef) {
          setExpandedDefinitions(new Set([newDef.id]));
          setAddingScheduleForDef(newDef.id);
        }
      }

      setShowDefinitionForm(false);
      setEditingDefinition(null);
      await loadData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving definition:', err);
      setError(err.message || 'Failed to save daypart definition');
    }
  };

  const handleDeleteDefinition = async (definition: DaypartDefinition) => {
    if (!confirm(`Delete "${definition.display_label}"? This will also delete all its schedules.`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('daypart_definitions')
        .delete()
        .eq('id', definition.id);

      if (deleteError) throw deleteError;

      setSuccess('Daypart definition deleted successfully');
      await loadData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting definition:', err);
      setError(err.message || 'Failed to delete daypart definition');
    }
  };

  const handleAddSchedule = (defId: string) => {
    setAddingScheduleForDef(defId);
    setEditingSchedule(null);
    setExpandedDefinitions(new Set([...expandedDefinitions, defId]));
  };

  const handleEditSchedule = (schedule: DaypartSchedule) => {
    setEditingSchedule(schedule);
    setAddingScheduleForDef(null);
  };

  const handleSaveSchedule = async (schedule: Schedule) => {
    try {
      if (editingSchedule) {
        const { error: updateError } = await supabase
          .from('daypart_schedules')
          .update({
            days_of_week: schedule.days_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSchedule.id);

        if (updateError) throw updateError;
      } else if (addingScheduleForDef) {
        const { error: insertError } = await supabase
          .from('daypart_schedules')
          .insert([{
            daypart_definition_id: addingScheduleForDef,
            days_of_week: schedule.days_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          }]);

        if (insertError) throw insertError;
      }

      setEditingSchedule(null);
      setAddingScheduleForDef(null);
      await loadData();
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.message || 'Failed to save schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('daypart_schedules')
        .delete()
        .eq('id', scheduleId);

      if (deleteError) throw deleteError;

      await loadData();
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      setError(err.message || 'Failed to delete schedule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Clock className="w-7 h-7 text-blue-600" />
            Global Daypart Definitions
          </h1>
          <p className="text-slate-600 mt-1">
            Define daypart types and their operating schedules used across all locations
          </p>
        </div>
        <button
          onClick={handleAddDefinition}
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

      <div className="space-y-3">
        {definitions.map((definition) => {
          const defSchedules = schedules.filter(s => s.daypart_definition_id === definition.id);
          const isExpanded = expandedDefinitions.has(definition.id);

          return (
            <div
              key={definition.id}
              className="border border-slate-200 bg-white rounded-lg transition-all"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${definition.color}`}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900">{definition.display_label}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Global
                        </span>
                      </div>
                      {definition.description && (
                        <p className="text-sm text-slate-600 mb-1">{definition.description}</p>
                      )}
                      <div className="text-xs text-slate-500">
                        {defSchedules.length} {defSchedules.length === 1 ? 'schedule' : 'schedules'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditDefinition(definition)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit definition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDefinition(definition)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete definition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpanded(definition.id)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-semibold text-slate-900">Schedules</h5>
                    {!addingScheduleForDef && !editingSchedule && (
                      <button
                        onClick={() => handleAddSchedule(definition.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Schedule
                      </button>
                    )}
                  </div>

                  {defSchedules.length === 0 && !addingScheduleForDef ? (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      No schedules yet. Add a schedule to define when this daypart is active.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {defSchedules.map((schedule) => (
                        editingSchedule?.id === schedule.id ? (
                          <ScheduleGroupForm
                            key={schedule.id}
                            schedule={editingSchedule}
                            allSchedules={schedules}
                            onUpdate={setEditingSchedule}
                            onSave={() => handleSaveSchedule(editingSchedule)}
                            onCancel={() => setEditingSchedule(null)}
                            level="global"
                          />
                        ) : (
                          <ScheduleGroupCard
                            key={schedule.id}
                            schedule={schedule}
                            onEdit={() => handleEditSchedule(schedule)}
                            onDelete={() => handleDeleteSchedule(schedule.id!)}
                            level="global"
                          />
                        )
                      ))}

                      {addingScheduleForDef === definition.id && (
                        <ScheduleGroupForm
                          schedule={{
                            daypart_name: definition.daypart_name,
                            days_of_week: [],
                            start_time: '06:00',
                            end_time: '11:00',
                          }}
                          allSchedules={schedules}
                          onUpdate={() => {}}
                          onSave={() => handleSaveSchedule({
                            daypart_name: definition.daypart_name,
                            days_of_week: [],
                            start_time: '06:00',
                            end_time: '11:00',
                          })}
                          onCancel={() => setAddingScheduleForDef(null)}
                          level="global"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {definitions.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 mb-4">No daypart definitions yet. Add your first definition to get started.</p>
            <button
              onClick={handleAddDefinition}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Definition
            </button>
          </div>
        )}
      </div>

      {showDefinitionForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDefinitionForm(false);
              setEditingDefinition(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingDefinition ? 'Edit Daypart Definition' : 'Add Daypart Definition'}
              </h3>
              <button
                onClick={() => {
                  setShowDefinitionForm(false);
                  setEditingDefinition(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDefinition} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Daypart Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingDefinition}
                  value={formData.daypart_name}
                  onChange={(e) => setFormData({ ...formData, daypart_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="e.g., breakfast, lunch"
                />
                {!editingDefinition && (
                  <p className="text-xs text-slate-500 mt-1">
                    Lowercase, no spaces. Used internally for matching with routines.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Display Label *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_label}
                  onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Breakfast"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Morning meal service period"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color Theme
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="bg-amber-100 text-amber-800 border-amber-300">Amber (Breakfast)</option>
                    <option value="bg-green-100 text-green-800 border-green-300">Green (Lunch)</option>
                    <option value="bg-blue-100 text-blue-800 border-blue-300">Blue (Dinner)</option>
                    <option value="bg-violet-100 text-violet-800 border-violet-300">Violet (Late Night)</option>
                    <option value="bg-slate-100 text-slate-800 border-slate-300">Slate (Dark Hours)</option>
                    <option value="bg-rose-100 text-rose-800 border-rose-300">Rose</option>
                    <option value="bg-orange-100 text-orange-800 border-orange-300">Orange</option>
                    <option value="bg-emerald-100 text-emerald-800 border-emerald-300">Emerald</option>
                    <option value="bg-teal-100 text-teal-800 border-teal-300">Teal</option>
                    <option value="bg-cyan-100 text-cyan-800 border-cyan-300">Cyan</option>
                    <option value="bg-indigo-100 text-indigo-800 border-indigo-300">Indigo</option>
                    <option value="bg-purple-100 text-purple-800 border-purple-300">Purple</option>
                    <option value="bg-pink-100 text-pink-800 border-pink-300">Pink</option>
                  </select>
                  <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${formData.color}`}>
                    Preview
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Icon
                  </label>
                  <IconPicker
                    selectedIcon={formData.icon}
                    onSelect={(icon) => setFormData({ ...formData, icon })}
                  />
                </div>
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
                    setShowDefinitionForm(false);
                    setEditingDefinition(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
