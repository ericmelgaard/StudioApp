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

type ContextLevel = 'wand' | 'concept' | 'company' | 'store';

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
  const [currentConceptId, setCurrentConceptId] = useState<number | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);
  const [siteRootPlacementId, setSiteRootPlacementId] = useState<string | null>(null);

  const [wandDefinitions, setWandDefinitions] = useState<DaypartDefinition[]>([]);
  const [conceptDefinitions, setConceptDefinitions] = useState<DaypartDefinition[]>([]);
  const [companyDefinitions, setCompanyDefinitions] = useState<DaypartDefinition[]>([]);
  const [storeDefinitions, setStoreDefinitions] = useState<DaypartDefinition[]>([]);
  const [schedules, setSchedules] = useState<DaypartSchedule[]>([]);
  const [siteRoutines, setSiteRoutines] = useState<SiteRoutine[]>([]);

  const [loading, setLoading] = useState(true);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<DaypartDefinition | null>(null);
  const [addingScheduleForDef, setAddingScheduleForDef] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DaypartSchedule | null>(null);
  const [addingSiteRoutineForDaypart, setAddingSiteRoutineForDaypart] = useState<string | null>(null);
  const [editingSiteRoutine, setEditingSiteRoutine] = useState<SiteRoutine | null>(null);
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
  }, [contextLevel, currentConceptId, currentCompanyId, currentStoreId, siteRootPlacementId]);

  const detectContextLevel = async () => {
    if (location.store) {
      setCurrentStoreId(location.store.id);
      setCurrentCompanyId(location.company?.id || null);
      setCurrentConceptId(location.concept?.id || null);

      const { data: placementData } = await supabase
        .from('placement_groups')
        .select('id')
        .eq('store_id', location.store.id)
        .is('parent_id', null)
        .maybeSingle();

      if (placementData) {
        setSiteRootPlacementId(placementData.id);
      }

      setContextLevel('store');
    } else if (location.company) {
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setCurrentCompanyId(location.company.id);
      setCurrentConceptId(location.concept?.id || null);
      setContextLevel('company');
    } else if (location.concept) {
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setCurrentCompanyId(null);
      setCurrentConceptId(location.concept.id);
      setContextLevel('concept');
    } else {
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setCurrentCompanyId(null);
      setCurrentConceptId(null);
      setContextLevel('wand');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const wandDefsQuery = supabase
        .from('daypart_definitions')
        .select('*')
        .is('store_id', null)
        .is('concept_id', null)
        .order('sort_order');

      const globalSchedulesQuery = supabase
        .from('daypart_schedules')
        .select('*');

      if (contextLevel === 'wand') {
        const [wandDefsResult, schedulesResult] = await Promise.all([
          wandDefsQuery,
          globalSchedulesQuery
        ]);

        if (wandDefsResult.error) throw wandDefsResult.error;
        if (schedulesResult.error) throw schedulesResult.error;

        setWandDefinitions(wandDefsResult.data || []);
        setSchedules(schedulesResult.data || []);
        setConceptDefinitions([]);
        setCompanyDefinitions([]);
        setStoreDefinitions([]);
        setSiteRoutines([]);
      } else if (contextLevel === 'concept' && currentConceptId) {
        const conceptDefsQuery = supabase
          .from('daypart_definitions')
          .select('*')
          .eq('concept_id', currentConceptId)
          .is('store_id', null)
          .order('sort_order');

        const [wandDefsResult, schedulesResult, conceptDefsResult] = await Promise.all([
          wandDefsQuery,
          globalSchedulesQuery,
          conceptDefsQuery
        ]);

        if (wandDefsResult.error) throw wandDefsResult.error;
        if (schedulesResult.error) throw schedulesResult.error;
        if (conceptDefsResult.error) throw conceptDefsResult.error;

        setWandDefinitions(wandDefsResult.data || []);
        setSchedules(schedulesResult.data || []);
        setConceptDefinitions(conceptDefsResult.data || []);
        setCompanyDefinitions([]);
        setStoreDefinitions([]);
        setSiteRoutines([]);
      } else if (contextLevel === 'company' && currentConceptId && currentCompanyId) {
        const conceptDefsQuery = supabase
          .from('daypart_definitions')
          .select('*')
          .eq('concept_id', currentConceptId)
          .is('store_id', null)
          .order('sort_order');

        const [wandDefsResult, schedulesResult, conceptDefsResult] = await Promise.all([
          wandDefsQuery,
          globalSchedulesQuery,
          conceptDefsQuery
        ]);

        if (wandDefsResult.error) throw wandDefsResult.error;
        if (schedulesResult.error) throw schedulesResult.error;
        if (conceptDefsResult.error) throw conceptDefsResult.error;

        setWandDefinitions(wandDefsResult.data || []);
        setSchedules(schedulesResult.data || []);
        setConceptDefinitions(conceptDefsResult.data || []);
        setCompanyDefinitions([]);
        setStoreDefinitions([]);
        setSiteRoutines([]);
      } else if (contextLevel === 'store' && currentConceptId && currentCompanyId && currentStoreId && siteRootPlacementId) {
        const conceptDefsQuery = supabase
          .from('daypart_definitions')
          .select('*')
          .eq('concept_id', currentConceptId)
          .is('store_id', null)
          .order('sort_order');

        const storeDefsQuery = supabase
          .from('daypart_definitions')
          .select('*')
          .eq('store_id', currentStoreId)
          .order('sort_order');

        const siteRoutinesQuery = supabase
          .from('site_daypart_routines')
          .select('*')
          .eq('placement_group_id', siteRootPlacementId);

        const [wandDefsResult, schedulesResult, conceptDefsResult, storeDefsResult, siteRoutinesResult] = await Promise.all([
          wandDefsQuery,
          globalSchedulesQuery,
          conceptDefsQuery,
          storeDefsQuery,
          siteRoutinesQuery
        ]);

        if (wandDefsResult.error) throw wandDefsResult.error;
        if (schedulesResult.error) throw schedulesResult.error;
        if (conceptDefsResult.error) throw conceptDefsResult.error;
        if (storeDefsResult.error) throw storeDefsResult.error;
        if (siteRoutinesResult.error) throw siteRoutinesResult.error;

        setWandDefinitions(wandDefsResult.data || []);
        setSchedules(schedulesResult.data || []);
        setConceptDefinitions(conceptDefsResult.data || []);
        setCompanyDefinitions([]);
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
    const allDefinitions = [...wandDefinitions, ...conceptDefinitions, ...storeDefinitions];
    setFormData({
      daypart_name: '',
      display_label: '',
      description: '',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: 'Clock',
      sort_order: allDefinitions.length * 10,
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
        setSuccess('Daypart updated successfully');
      } else {
        const insertData: any = {
          daypart_name: formData.daypart_name,
          display_label: formData.display_label,
          description: formData.description,
          color: formData.color,
          icon: formData.icon,
          sort_order: formData.sort_order,
          is_active: true,
        };

        if (contextLevel === 'concept' && currentConceptId) {
          insertData.concept_id = currentConceptId;
        } else if (contextLevel === 'store' && currentStoreId) {
          insertData.store_id = currentStoreId;
          insertData.concept_id = currentConceptId;
        }

        const { data: newDef, error: insertError } = await supabase
          .from('daypart_definitions')
          .insert([insertData])
          .select()
          .single();

        if (insertError) throw insertError;
        setSuccess(`Daypart created at ${contextLevel} level`);

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

      setSuccess('Daypart deleted successfully');
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

  const handleAddSiteRoutine = (daypartName: string) => {
    setAddingSiteRoutineForDaypart(daypartName);
    setEditingSiteRoutine(null);
  };

  const handleEditSiteRoutine = (routine: SiteRoutine) => {
    setEditingSiteRoutine(routine);
    setAddingSiteRoutineForDaypart(null);
  };

  const handleSaveSiteRoutine = async (schedule: Schedule, daypartName: string) => {
    if (!siteRootPlacementId) return;

    try {
      if (editingSiteRoutine) {
        const { error: updateError } = await supabase
          .from('site_daypart_routines')
          .update({
            days_of_week: schedule.days_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSiteRoutine.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('site_daypart_routines')
          .insert([{
            placement_group_id: siteRootPlacementId,
            daypart_name: daypartName,
            days_of_week: schedule.days_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          }]);

        if (insertError) throw insertError;
      }

      setEditingSiteRoutine(null);
      setAddingSiteRoutineForDaypart(null);
      await loadData();
    } catch (err: any) {
      console.error('Error saving site routine:', err);
      setError(err.message || 'Failed to save site routine');
    }
  };

  const handleDeleteSiteRoutine = async (routineId: string) => {
    if (!confirm('Are you sure you want to delete this site-specific schedule?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('site_daypart_routines')
        .delete()
        .eq('id', routineId);

      if (deleteError) throw deleteError;

      await loadData();
    } catch (err: any) {
      console.error('Error deleting site routine:', err);
      setError(err.message || 'Failed to delete site routine');
    }
  };

  const renderDaypartCard = (definition: DaypartDefinition, level: string) => {
    const defSchedules = schedules
      .filter(s => s.daypart_definition_id === definition.id)
      .map(s => ({ ...s, daypart_name: definition.daypart_name }));

    const siteDaypartRoutines = siteRoutines.filter(r => r.daypart_name === definition.daypart_name);

    const isEditable =
      (level === 'wand' && contextLevel === 'wand') ||
      (level === 'concept' && contextLevel === 'concept') ||
      (level === 'store' && contextLevel === 'store');

    const canAddSiteOverride = contextLevel === 'store' && level !== 'store';

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
            </div>
            <div className="flex items-center gap-1">
              {isEditable && (
                <>
                  <button
                    onClick={() => handleEditDefinition(definition)}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    title="Edit daypart"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDefinition(definition)}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    title="Delete daypart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              {defSchedules.length > 0 && !addingScheduleForDef && !editingSchedule && isEditable && (
                <button
                  onClick={() => handleAddSchedule(definition.id)}
                  className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                  title="Add schedule"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {canAddSiteOverride && !addingSiteRoutineForDaypart && !editingSiteRoutine && (
                <button
                  onClick={() => handleAddSiteRoutine(definition.daypart_name)}
                  className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                  title="Add site-specific schedule"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {defSchedules.length === 0 && siteDaypartRoutines.length === 0 && !addingScheduleForDef && !addingSiteRoutineForDaypart ? (
          <div className="p-6 text-center">
            <p className="text-slate-600 text-sm mb-4">
              {canAddSiteOverride
                ? 'No schedules defined yet. Add a site-specific schedule for this location.'
                : 'No schedules yet. Add a schedule to define when this daypart is active.'
              }
            </p>
            {isEditable && (
              <button
                onClick={() => handleAddSchedule(definition.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Schedule
              </button>
            )}
            {canAddSiteOverride && (
              <button
                onClick={() => handleAddSiteRoutine(definition.daypart_name)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Site Schedule
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {defSchedules.length > 0 && (
              <>
                {level !== 'store' && contextLevel === 'store' && (
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      {level === 'wand' ? 'WAND' : 'Concept'} Level Schedules (Read-only)
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
                      <div className={`p-4 transition-colors group ${canAddSiteOverride ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-slate-900">
                                {schedule.start_time} - {schedule.end_time}
                              </span>
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
                          {isEditable && (
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
                        onSave={(newSchedule) => handleSaveSchedule(newSchedule)}
                        onCancel={() => setAddingScheduleForDef(null)}
                        level="global"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {(siteDaypartRoutines.length > 0 || (canAddSiteOverride && defSchedules.length > 0)) && (
              <>
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
                      <MapPin className="w-4 h-4" />
                      Site-Specific Schedules {siteDaypartRoutines.length === 0 && '(Optional Override)'}
                    </div>
                    {!addingSiteRoutineForDaypart && !editingSiteRoutine && (
                      <button
                        onClick={() => handleAddSiteRoutine(definition.daypart_name)}
                        className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                      >
                        + Add Schedule
                      </button>
                    )}
                  </div>
                </div>
                {siteDaypartRoutines.length === 0 && (
                  <div className="px-4 py-3 bg-amber-50/20 text-center">
                    <p className="text-xs text-slate-600">
                      No site-specific schedules. Using {level === 'wand' ? 'WAND' : 'concept'} level schedules.
                    </p>
                  </div>
                )}
                {siteDaypartRoutines.map((routine) => (
                  <div key={routine.id}>
                    {editingSiteRoutine?.id === routine.id ? (
                      <div className="px-4 pb-4 bg-amber-50/30 border-t border-amber-100">
                        <div className="pt-4">
                          <ScheduleGroupForm
                            schedule={editingSiteRoutine}
                            allSchedules={siteDaypartRoutines}
                            onUpdate={setEditingSiteRoutine}
                            onSave={() => handleSaveSiteRoutine(editingSiteRoutine, definition.daypart_name)}
                            onCancel={() => setEditingSiteRoutine(null)}
                            level="site"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50/30 hover:bg-amber-50/50 transition-colors group">
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
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditSiteRoutine(routine)}
                              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit site schedule"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSiteRoutine(routine.id!)}
                              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete site schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {addingSiteRoutineForDaypart === definition.daypart_name && (
              <div className="px-4 pb-4 bg-amber-50/30">
                <div className="pt-4">
                  <ScheduleGroupForm
                    schedule={{
                      daypart_name: definition.daypart_name,
                      placement_group_id: siteRootPlacementId || '',
                      days_of_week: [],
                      start_time: '06:00',
                      end_time: '11:00',
                    }}
                    allSchedules={siteDaypartRoutines}
                    onUpdate={() => {}}
                    onSave={(newSchedule) => handleSaveSiteRoutine(newSchedule, definition.daypart_name)}
                    onCancel={() => setAddingSiteRoutineForDaypart(null)}
                    level="site"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
                  WAND Level
                </span>
              )}
              {contextLevel === 'concept' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-green-100 text-green-800 border border-green-300 rounded-lg">
                  <Layers className="w-4 h-4" />
                  Concept Level
                </span>
              )}
              {contextLevel === 'company' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-lg">
                  <Building2 className="w-4 h-4" />
                  Company Level
                </span>
              )}
              {contextLevel === 'store' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded-lg">
                  <MapPin className="w-4 h-4" />
                  Store Level
                </span>
              )}
            </h1>
            {contextLevel === 'wand' ? (
              <p className="text-slate-600 mt-1">
                Define daypart types and schedules at the global WAND level
              </p>
            ) : (
              <div className="mt-1">
                <p className="text-slate-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {getLocationBreadcrumb()}
                </p>
                <p className="text-slate-500 text-sm mt-0.5">
                  {contextLevel === 'concept' && 'View WAND dayparts and manage concept-specific dayparts'}
                  {contextLevel === 'company' && 'View WAND and Concept dayparts and manage company-specific dayparts'}
                  {contextLevel === 'store' && 'View all inherited dayparts and manage store-specific dayparts'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleAddDefinition}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Daypart
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

      <div className="space-y-8">
        {wandDefinitions.length > 0 && (
          <div className="space-y-4">
            {contextLevel !== 'wand' && (
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <Layers className="w-4 h-4" />
                WAND Level Dayparts
              </div>
            )}
            {wandDefinitions.map(definition => renderDaypartCard(definition, 'wand'))}
          </div>
        )}

        {conceptDefinitions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-800 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <Layers className="w-4 h-4" />
              Concept Level Dayparts
            </div>
            {conceptDefinitions.map(definition => renderDaypartCard(definition, 'concept'))}
          </div>
        )}

        {storeDefinitions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800 bg-cyan-50 px-4 py-2 rounded-lg border border-cyan-200">
              <Building2 className="w-4 h-4" />
              Store Level Dayparts
            </div>
            {storeDefinitions.map(definition => renderDaypartCard(definition, 'store'))}
          </div>
        )}

        {wandDefinitions.length === 0 && conceptDefinitions.length === 0 && storeDefinitions.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 mb-4">
              {contextLevel === 'wand'
                ? 'No daypart definitions yet. Add your first daypart to get started.'
                : 'No dayparts found at this level. Add a daypart to create a unique schedule for this level.'}
            </p>
            <button
              onClick={handleAddDefinition}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Daypart
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
                {editingDefinition
                  ? 'Edit Daypart'
                  : `Add ${contextLevel === 'wand' ? 'WAND Level' : contextLevel === 'concept' ? 'Concept Level' : contextLevel === 'company' ? 'Company Level' : 'Store Level'} Daypart`
                }
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
