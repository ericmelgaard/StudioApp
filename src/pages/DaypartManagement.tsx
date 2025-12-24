import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, AlertCircle, Check, X, MapPin, Building2, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconPicker from '../components/IconPicker';
import ScheduleGroupForm from '../components/ScheduleGroupForm';
import { Schedule } from '../hooks/useScheduleCollisionDetection';
import { useLocation } from '../hooks/useLocation';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  concept_id: number | null;
  store_id: number | null;
}

interface DaypartSchedule extends Schedule {
  daypart_definition_id: string;
}

interface SiteRoutine extends Schedule {
  placement_group_id: string;
  daypart_name: string;
}

interface PlacementOverride extends Schedule {
  placement_group_id: string;
  daypart_name: string;
}

type ContextLevel = 'wand' | 'site' | 'placement';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

export default function DaypartManagement() {
  const { location, getLocationBreadcrumb } = useLocation();
  const [contextLevel, setContextLevel] = useState<ContextLevel>('wand');
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);
  const [siteRootPlacementId, setSiteRootPlacementId] = useState<string | null>(null);

  const [definitions, setDefinitions] = useState<DaypartDefinition[]>([]);
  const [schedules, setSchedules] = useState<DaypartSchedule[]>([]);
  const [siteRoutines, setSiteRoutines] = useState<SiteRoutine[]>([]);
  const [storeDefinitions, setStoreDefinitions] = useState<DaypartDefinition[]>([]);

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
    detectContextLevel();
  }, [location]);

  useEffect(() => {
    loadData();
  }, [contextLevel, currentStoreId, siteRootPlacementId]);

  const detectContextLevel = async () => {
    if (location.store) {
      setCurrentStoreId(location.store.id);

      const { data: placementData } = await supabase
        .from('placement_groups')
        .select('id')
        .eq('store_id', location.store.id)
        .is('parent_id', null)
        .maybeSingle();

      if (placementData) {
        setSiteRootPlacementId(placementData.id);
      }

      setContextLevel('site');
    } else {
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setContextLevel('wand');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const globalDefsQuery = supabase
        .from('daypart_definitions')
        .select('*')
        .is('store_id', null)
        .is('concept_id', null)
        .order('sort_order');

      const globalSchedulesQuery = supabase
        .from('daypart_schedules')
        .select('*');

      if (contextLevel === 'wand') {
        const [defsResult, schedulesResult] = await Promise.all([
          globalDefsQuery,
          globalSchedulesQuery
        ]);

        if (defsResult.error) throw defsResult.error;
        if (schedulesResult.error) throw schedulesResult.error;

        setDefinitions(defsResult.data || []);
        setSchedules(schedulesResult.data || []);
        setSiteRoutines([]);
        setStoreDefinitions([]);
      } else if (contextLevel === 'site' && currentStoreId && siteRootPlacementId) {
        const storeDefsQuery = supabase
          .from('daypart_definitions')
          .select('*')
          .eq('store_id', currentStoreId)
          .order('sort_order');

        const siteRoutinesQuery = supabase
          .from('site_daypart_routines')
          .select('*')
          .eq('placement_group_id', siteRootPlacementId);

        const [defsResult, schedulesResult, storeDefsResult, siteRoutinesResult] = await Promise.all([
          globalDefsQuery,
          globalSchedulesQuery,
          storeDefsQuery,
          siteRoutinesQuery
        ]);

        if (defsResult.error) throw defsResult.error;
        if (schedulesResult.error) throw schedulesResult.error;
        if (storeDefsResult.error) throw storeDefsResult.error;
        if (siteRoutinesResult.error) throw siteRoutinesResult.error;

        setDefinitions(defsResult.data || []);
        setSchedules(schedulesResult.data || []);
        setStoreDefinitions(storeDefsResult.data || []);
        setSiteRoutines(siteRoutinesResult.data || []);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load daypart data');
    } finally {
      setLoading(false);
    }
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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Clock className="w-7 h-7 text-blue-600" />
              Daypart Management
              {contextLevel === 'wand' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded-lg">
                  <Layers className="w-4 h-4" />
                  Global Level
                </span>
              )}
              {contextLevel === 'site' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded-lg">
                  <Building2 className="w-4 h-4" />
                  Site Level
                </span>
              )}
            </h1>
            {contextLevel === 'wand' ? (
              <p className="text-slate-600 mt-1">
                Define daypart types and their operating schedules used across all locations
              </p>
            ) : (
              <div className="mt-1">
                <p className="text-slate-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {getLocationBreadcrumb()}
                </p>
                <p className="text-slate-500 text-sm mt-0.5">
                  View global definitions and manage site-specific overrides
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleAddDefinition}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {contextLevel === 'wand' ? 'Add Definition' : 'Add Override'}
          </button>
        </div>
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

      <div className="space-y-4">
        {definitions.map((definition) => {
          const defSchedules = schedules
            .filter(s => s.daypart_definition_id === definition.id)
            .map(s => ({ ...s, daypart_name: definition.daypart_name }));

          const siteRoutinesForDaypart = contextLevel === 'site'
            ? siteRoutines.filter(r => r.daypart_name === definition.daypart_name)
            : [];

          const hasSiteOverrides = siteRoutinesForDaypart.length > 0;

          return (
            <div
              key={definition.id}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden"
            >
              <div className={`px-4 py-3 ${definition.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="w-4 h-4" />
                    <h4 className="font-semibold">{definition.display_label}</h4>
                    {definition.description && (
                      <span className="text-xs opacity-75">• {definition.description}</span>
                    )}
                    {contextLevel === 'site' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        <Layers className="w-3 h-3" />
                        Global
                      </span>
                    )}
                    {hasSiteOverrides && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">
                        <Building2 className="w-3 h-3" />
                        {siteRoutinesForDaypart.length} Site Override{siteRoutinesForDaypart.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditDefinition(definition)}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                      title="Edit definition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDefinition(definition)}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                      title="Delete definition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {defSchedules.length > 0 && !addingScheduleForDef && !editingSchedule && (
                      <button
                        onClick={() => handleAddSchedule(definition.id)}
                        className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                        title="Add schedule"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {defSchedules.length === 0 && !addingScheduleForDef ? (
                <div className="p-6 text-center">
                  <p className="text-slate-600 text-sm mb-4">
                    No schedules yet. Add a schedule to define when this daypart is active.
                  </p>
                  <button
                    onClick={() => handleAddSchedule(definition.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Schedule
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {contextLevel === 'site' && defSchedules.length > 0 && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                        <Layers className="w-4 h-4" />
                        Global Schedules
                      </div>
                    </div>
                  )}
                  {defSchedules.map((schedule) => (
                        <div key={schedule.id}>
                          {editingSchedule?.id === schedule.id ? (
                            <div className="px-4 pb-4 bg-slate-50 border-t border-slate-200">
                              <div className="pt-4">
                                <ScheduleGroupForm
                                  schedule={editingSchedule}
                                  allSchedules={defSchedules}
                                  onUpdate={setEditingSchedule}
                                  onSave={() => handleSaveSchedule(editingSchedule)}
                                  onCancel={() => setEditingSchedule(null)}
                                  level="global"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className={`p-4 transition-colors group ${contextLevel === 'site' ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-medium text-slate-900">
                                      {schedule.start_time} - {schedule.end_time}
                                    </span>
                                    {contextLevel === 'site' && (
                                      <span className="text-xs text-blue-600 font-medium">Global</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {schedule.days_of_week.sort().map(day => {
                                      const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                                      return (
                                        <span
                                          key={day}
                                          className={`px-2 py-1 text-xs rounded font-medium ${definition.color}`}
                                        >
                                          {dayInfo?.short}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                                {contextLevel === 'wand' && (
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleEditSchedule(schedule)}
                                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit schedule"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSchedule(schedule.id!)}
                                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete schedule"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                  {contextLevel === 'site' && siteRoutinesForDaypart.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                          <Building2 className="w-4 h-4" />
                          Site Overrides for {location.store?.name}
                        </div>
                      </div>
                      {siteRoutinesForDaypart.map((routine) => (
                        <div key={routine.id} className="p-4 bg-amber-50/30 hover:bg-amber-50/50 transition-colors group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {routine.start_time} - {routine.end_time}
                                </span>
                                <span className="text-xs text-amber-600 font-medium">Site Override</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {routine.days_of_week.sort().map(day => {
                                  const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                                  return (
                                    <span
                                      key={day}
                                      className="px-2 py-1 text-xs rounded font-medium bg-amber-100 text-amber-800 border border-amber-300"
                                    >
                                      {dayInfo?.short}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {addingScheduleForDef === definition.id && (
                    <div className="px-4 pb-4 bg-slate-50">
                      <div className="pt-4">
                        <ScheduleGroupForm
                          schedule={{
                            daypart_name: definition.daypart_name,
                            daypart_definition_id: definition.id,
                            days_of_week: [],
                            start_time: '06:00',
                            end_time: '11:00',
                          }}
                          allSchedules={defSchedules}
                          onUpdate={() => {}}
                          onSave={() => handleSaveSchedule({
                            daypart_name: definition.daypart_name,
                            daypart_definition_id: definition.id,
                            days_of_week: [],
                            start_time: '06:00',
                            end_time: '11:00',
                          })}
                          onCancel={() => setAddingScheduleForDef(null)}
                          level="global"
                        />
                      </div>
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
