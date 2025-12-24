import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, AlertCircle, Check, X, Calendar, ChevronDown, ChevronRight, MapPin, Layers, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconPicker from '../components/IconPicker';
import ScheduleGroupForm from '../components/ScheduleGroupForm';
import { useLocation } from '../hooks/useLocation';
import { Schedule } from '../hooks/useScheduleCollisionDetection';
import DaypartAdvancedView from '../components/DaypartAdvancedView';

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
  daypart_definition_id: string;
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
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);
  const [siteRootPlacementId, setSiteRootPlacementId] = useState<string | null>(null);

  const [definitions, setDefinitions] = useState<DaypartDefinition[]>([]);
  const [allSchedules, setAllSchedules] = useState<DaypartSchedule[]>([]);
  const [siteRoutines, setSiteRoutines] = useState<SiteRoutine[]>([]);

  const [loading, setLoading] = useState(true);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<DaypartDefinition | null>(null);
  const [addingScheduleForDef, setAddingScheduleForDef] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DaypartSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [showAdvancedView, setShowAdvancedView] = useState(false);

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
  }, [contextLevel, currentConceptId, currentStoreId, siteRootPlacementId]);

  const detectContextLevel = async () => {
    if (location.store) {
      setCurrentStoreId(location.store.id);
      setCurrentConceptId(location.concept?.id || null);

      const { data: placementData } = await supabase
        .from('placement_groups')
        .select('id')
        .eq('store_id', location.store.id)
        .is('parent_id', null)
        .maybeSingle();

      setSiteRootPlacementId(placementData?.id || null);
      setContextLevel('store');
    } else if (location.concept) {
      setCurrentConceptId(location.concept.id);
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setContextLevel('concept');
    } else {
      setCurrentConceptId(null);
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setContextLevel('wand');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([loadDefinitions(), loadSchedules(), loadSiteRoutines()]);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load daypart data');
    } finally {
      setLoading(false);
    }
  };

  const loadDefinitions = async () => {
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('*')
      .or(
        contextLevel === 'store'
          ? `concept_id.eq.${currentConceptId},store_id.eq.${currentStoreId},and(concept_id.is.null,store_id.is.null)`
          : contextLevel === 'concept'
          ? `concept_id.eq.${currentConceptId},and(concept_id.is.null,store_id.is.null)`
          : 'and(concept_id.is.null,store_id.is.null)'
      )
      .order('sort_order');

    if (error) {
      console.error('Error loading definitions:', error);
      setError('Failed to load daypart definitions');
    } else {
      setDefinitions(data || []);
    }
  };

  const loadSchedules = async () => {
    const { data, error } = await supabase
      .from('daypart_schedules')
      .select('*');

    if (error) {
      console.error('Error loading schedules:', error);
    } else {
      setAllSchedules(data || []);
    }
  };

  const loadSiteRoutines = async () => {
    if (!siteRootPlacementId) {
      setSiteRoutines([]);
      return;
    }

    const { data, error } = await supabase
      .from('site_daypart_routines')
      .select('*')
      .eq('placement_group_id', siteRootPlacementId);

    if (error) {
      console.error('Error loading site routines:', error);
    } else {
      setSiteRoutines(data || []);
    }
  };

  const handleSubmitDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const defData = {
        ...formData,
        concept_id: contextLevel === 'concept' || contextLevel === 'store' ? currentConceptId : null,
        store_id: contextLevel === 'store' ? currentStoreId : null,
        is_active: true,
      };

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
          .insert([defData])
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
      setError(err.message || 'Failed to delete definition');
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

  const toggleEventsExpanded = (defId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [defId]: !prev[defId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (showAdvancedView) {
    return (
      <DaypartAdvancedView
        locationId={currentStoreId}
        conceptId={currentConceptId}
        onClose={() => setShowAdvancedView(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-7 h-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Daypart Management</h1>
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
              {contextLevel === 'store' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded-lg">
                  <MapPin className="w-4 h-4" />
                  Store Level
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedView(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg"
                title="Power user mode with advanced features"
              >
                <Zap className="w-5 h-5" />
                Advanced View
              </button>
              {!showDefinitionForm && (
                <button
                  onClick={() => {
                    setEditingDefinition(null);
                    setFormData({
                      daypart_name: '',
                      display_label: '',
                      description: '',
                      color: 'bg-blue-100 text-blue-800 border-blue-300',
                      icon: 'Clock',
                      sort_order: definitions.length,
                    });
                    setShowDefinitionForm(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Daypart
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">

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

      <div className="space-y-4 mb-6">
        {definitions.map((definition) => {
          const defSchedules = allSchedules
            .filter(s => s.daypart_definition_id === definition.id)
            .map(s => ({ ...s, daypart_name: definition.daypart_name }));
          const regularSchedules = defSchedules.filter(s => s.schedule_type !== 'event_holiday');
          const eventSchedules = defSchedules.filter(s => s.schedule_type === 'event_holiday');
          const hasEvents = eventSchedules.length > 0;
          const eventsExpanded = expandedEvents[definition.id];

          const isDefinitionEditable =
            (definition.store_id === null && definition.concept_id === null && contextLevel === 'wand') ||
            (definition.concept_id !== null && definition.store_id === null && contextLevel === 'concept') ||
            (definition.store_id !== null && contextLevel === 'store');

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
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        definition.store_id
                          ? 'bg-blue-600/20 text-blue-900'
                          : definition.concept_id
                          ? 'bg-purple-600/20 text-purple-900'
                          : 'bg-slate-600/20 text-slate-900'
                      }`}
                    >
                      {definition.store_id
                        ? 'Store'
                        : definition.concept_id
                        ? 'Concept'
                        : 'Global'}
                    </span>
                    {hasEvents && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-900 font-medium">
                        <Calendar className="w-3 h-3" />
                        {eventSchedules.length} {eventSchedules.length === 1 ? 'Event' : 'Events'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isDefinitionEditable && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDefinition(definition);
                            setFormData({
                              daypart_name: definition.daypart_name,
                              display_label: definition.display_label,
                              description: definition.description,
                              color: definition.color,
                              icon: definition.icon,
                              sort_order: definition.sort_order,
                            });
                            setShowDefinitionForm(true);
                          }}
                          className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                          title="Edit definition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDefinition(definition)}
                          className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                          title="Delete definition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {regularSchedules.length > 0 && !addingScheduleForDef && !editingSchedule && (
                      <button
                        type="button"
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

              {regularSchedules.length === 0 && !addingScheduleForDef && !hasEvents ? (
                <div className="p-6 text-center">
                  <p className="text-slate-600 text-sm mb-4">
                    No schedules yet. Add a schedule to define when this daypart is active.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAddSchedule(definition.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Schedule
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {regularSchedules.map((schedule) => (
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
                              level="site"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 hover:bg-slate-50 transition-colors group">
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
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleEditSchedule(schedule)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit schedule"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(schedule.id!)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete schedule"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
                          onSave={() => handleSaveSchedule({
                            daypart_name: definition.daypart_name,
                            daypart_definition_id: definition.id,
                            days_of_week: [],
                            start_time: '06:00',
                            end_time: '11:00',
                          })}
                          onCancel={() => setAddingScheduleForDef(null)}
                          level="site"
                        />
                      </div>
                    </div>
                  )}

                  {hasEvents && (
                    <div className="border-t-2 border-violet-200">
                      <button
                        type="button"
                        onClick={() => toggleEventsExpanded(definition.id)}
                        className="w-full px-4 py-3 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-violet-600" />
                          <span className="font-medium text-violet-900">
                            Event & Holiday Schedules
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-900">
                            {eventSchedules.length}
                          </span>
                        </div>
                        {eventsExpanded ? (
                          <ChevronDown className="w-5 h-5 text-violet-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-violet-600" />
                        )}
                      </button>

                      {eventsExpanded && (
                        <div className="divide-y divide-violet-100 bg-violet-50/30">
                          {eventSchedules.map((schedule) => (
                            <div key={schedule.id}>
                              {editingSchedule?.id === schedule.id ? (
                                <div className="px-4 pb-4 bg-violet-50 border-t border-violet-200">
                                  <div className="pt-4">
                                    <ScheduleGroupForm
                                      schedule={editingSchedule}
                                      allSchedules={defSchedules}
                                      onUpdate={setEditingSchedule}
                                      onSave={() => handleSaveSchedule(editingSchedule)}
                                      onCancel={() => setEditingSchedule(null)}
                                      level="site"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 hover:bg-violet-100/50 transition-colors group">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="font-medium text-violet-900">
                                          {schedule.event_name}
                                        </span>
                                        <span className="text-sm text-violet-700">
                                          {schedule.start_time} - {schedule.end_time}
                                        </span>
                                      </div>
                                      {schedule.recurrence_type && schedule.recurrence_type !== 'none' && (
                                        <div className="text-xs text-violet-600 mb-1">
                                          {schedule.recurrence_type === 'annual_date' && 'Recurs annually'}
                                          {schedule.recurrence_type === 'monthly_date' && 'Recurs monthly'}
                                          {schedule.recurrence_type === 'annual_relative' && 'Recurs annually (relative)'}
                                          {schedule.recurrence_type === 'annual_date_range' && 'Annual date range'}
                                        </div>
                                      )}
                                      {schedule.event_date && (
                                        <div className="text-xs text-violet-600">
                                          Date: {new Date(schedule.event_date).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => handleEditSchedule(schedule)}
                                        className="p-2 text-violet-600 hover:text-violet-700 hover:bg-violet-200/50 rounded-lg transition-colors"
                                        title="Edit schedule"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSchedule(schedule.id!)}
                                        className="p-2 text-violet-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete schedule"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {definitions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 mb-2">No Daypart Definitions Available</h3>
            <p className="text-slate-600 text-sm mb-4">
              {contextLevel === 'store'
                ? 'No daypart definitions have been created at WAND or concept level yet.'
                : 'Create your first daypart definition to get started.'}
            </p>
            {contextLevel !== 'store' && (
              <button
                onClick={() => {
                  setEditingDefinition(null);
                  setFormData({
                    daypart_name: '',
                    display_label: '',
                    description: '',
                    color: 'bg-blue-100 text-blue-800 border-blue-300',
                    icon: 'Clock',
                    sort_order: 0,
                  });
                  setShowDefinitionForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Daypart
              </button>
            )}
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
                type="button"
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
                  rows={2}
                  placeholder="Description of this daypart"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="bg-blue-100 text-blue-800 border-blue-300">Blue</option>
                    <option value="bg-green-100 text-green-800 border-green-300">Green</option>
                    <option value="bg-orange-100 text-orange-800 border-orange-300">Orange</option>
                    <option value="bg-red-100 text-red-800 border-red-300">Red</option>
                    <option value="bg-slate-100 text-slate-800 border-slate-300">Gray</option>
                  </select>
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
                />
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
    </div>
  );
}
