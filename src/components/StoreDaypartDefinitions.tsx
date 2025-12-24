import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, AlertCircle, Check, X, Eye, EyeOff, ChevronDown, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconPicker from './IconPicker';
import ScheduleGroupForm from './ScheduleGroupForm';
import { Schedule } from '../hooks/useScheduleCollisionDetection';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string;
  sort_order: number;
  store_id: number | null;
  concept_id: number | null;
  source_level: 'store' | 'concept' | 'global';
  is_customized: boolean;
  in_use?: boolean;
}

interface DaypartSchedule extends Schedule {
  daypart_definition_id: string;
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

interface StoreDaypartDefinitionsProps {
  storeId: number;
}

export default function StoreDaypartDefinitions({ storeId }: StoreDaypartDefinitionsProps) {
  const [definitions, setDefinitions] = useState<DaypartDefinition[]>([]);
  const [schedules, setSchedules] = useState<DaypartSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<DaypartDefinition | null>(null);
  const [addingScheduleForDef, setAddingScheduleForDef] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState<Schedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DaypartSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUnused, setShowUnused] = useState(false);
  const [inUseStatus, setInUseStatus] = useState<Record<string, boolean>>({});
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [isEventSchedule, setIsEventSchedule] = useState(false);
  const [newScheduleType, setNewScheduleType] = useState<'regular' | 'event_holiday' | null>(null);
  const [selectedDaypartId, setSelectedDaypartId] = useState<string>('');

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
  }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const defsResult = await supabase.rpc('get_effective_daypart_definitions', { p_store_id: storeId });

      if (defsResult.error) throw defsResult.error;

      const defs = defsResult.data || [];
      setDefinitions(defs);

      const initialInUseStatus: Record<string, boolean> = {};
      defs.forEach((def, index) => {
        initialInUseStatus[def.id] = index < 3;
      });
      setInUseStatus(initialInUseStatus);

      if (defs.length > 0) {
        const defIds = defs.map(d => d.id);
        const schedulesResult = await supabase
          .from('daypart_schedules')
          .select('*')
          .in('daypart_definition_id', defIds);

        if (schedulesResult.error) throw schedulesResult.error;
        setSchedules(schedulesResult.data || []);
      } else {
        setSchedules([]);
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
      description: '',
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
            color: formData.color,
            icon: formData.icon,
            sort_order: formData.sort_order,
            is_active: true,
            store_id: storeId,
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
    if (!definition.is_customized) {
      setError('Cannot delete inherited definitions');
      return;
    }

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
    const def = definitions.find(d => d.id === defId);
    setNewSchedule({
      daypart_name: def?.daypart_name || '',
      daypart_definition_id: defId,
      days_of_week: [],
      start_time: '06:00',
      end_time: '11:00',
      schedule_type: isEventSchedule ? 'event_holiday' : 'regular',
    });
    setAddingScheduleForDef(defId);
    setEditingSchedule(null);
  };

  const handleAddScheduleClick = () => {
    setNewScheduleType('regular');
    setIsEventSchedule(false);
    setNewSchedule({
      daypart_name: '',
      daypart_definition_id: '',
      days_of_week: [],
      start_time: '06:00',
      end_time: '11:00',
      schedule_type: 'regular',
    });
    setAddingScheduleForDef('new');
  };

  const handleAddEventScheduleClick = () => {
    setNewScheduleType('event_holiday');
    setIsEventSchedule(true);
    setNewSchedule({
      daypart_name: '',
      daypart_definition_id: '',
      days_of_week: [],
      start_time: '06:00',
      end_time: '11:00',
      schedule_type: 'event_holiday',
    });
    setAddingScheduleForDef('new');
  };

  const handleEditSchedule = (schedule: DaypartSchedule) => {
    setEditingSchedule(schedule);
    setAddingScheduleForDef(null);
  };

  const handleSaveSchedule = async (schedule: Schedule) => {
    try {
      if (editingSchedule) {
        const updateData: any = {
          days_of_week: schedule.days_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          updated_at: new Date().toISOString(),
        };

        if (schedule.schedule_name !== undefined) updateData.schedule_name = schedule.schedule_name;
        if (schedule.schedule_type) updateData.schedule_type = schedule.schedule_type;
        if (schedule.event_name) updateData.event_name = schedule.event_name;
        if (schedule.event_date) updateData.event_date = schedule.event_date;
        if (schedule.recurrence_type) updateData.recurrence_type = schedule.recurrence_type;
        if (schedule.recurrence_config) updateData.recurrence_config = schedule.recurrence_config;

        const { error: updateError } = await supabase
          .from('daypart_schedules')
          .update(updateData)
          .eq('id', editingSchedule.id);

        if (updateError) throw updateError;
      } else if (addingScheduleForDef) {
        const targetDaypartId = addingScheduleForDef === 'new' ? selectedDaypartId : addingScheduleForDef;

        if (!targetDaypartId || targetDaypartId === 'new') {
          throw new Error('Please select a daypart');
        }

        const insertData: any = {
          daypart_definition_id: targetDaypartId,
          days_of_week: schedule.days_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
        };

        if (schedule.schedule_name !== undefined) insertData.schedule_name = schedule.schedule_name;
        if (schedule.schedule_type) insertData.schedule_type = schedule.schedule_type;
        if (schedule.event_name) insertData.event_name = schedule.event_name;
        if (schedule.event_date) insertData.event_date = schedule.event_date;
        if (schedule.recurrence_type) insertData.recurrence_type = schedule.recurrence_type;
        if (schedule.recurrence_config) insertData.recurrence_config = schedule.recurrence_config;

        const { error: insertError } = await supabase
          .from('daypart_schedules')
          .insert([insertData]);

        if (insertError) throw insertError;
      }

      setEditingSchedule(null);
      setAddingScheduleForDef(null);
      setNewSchedule(null);
      setIsEventSchedule(false);
      setNewScheduleType(null);
      setSelectedDaypartId('');
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

  const toggleInUseStatus = (defId: string) => {
    setInUseStatus(prev => ({
      ...prev,
      [defId]: !prev[defId]
    }));
  };

  const toggleEventsExpanded = (defId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [defId]: !prev[defId]
    }));
  };

  const filteredDefinitions = definitions.filter(def =>
    showUnused || inUseStatus[def.id]
  );

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
          <h3 className="text-lg font-semibold text-slate-900">Daypart Schedules</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowUnused(!showUnused)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          {showUnused ? (
            <>
              <Eye className="w-4 h-4" />
              <span>Showing All</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Showing In-Use Only</span>
            </>
          )}
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

      <div className="space-y-4 mb-6">
        {filteredDefinitions.map((definition) => {
          const defSchedules = schedules
            .filter(s => s.daypart_definition_id === definition.id)
            .map(s => ({ ...s, daypart_name: definition.daypart_name }));
          const regularSchedules = defSchedules.filter(s => s.schedule_type !== 'event_holiday');
          const eventSchedules = defSchedules.filter(s => s.schedule_type === 'event_holiday');
          const isInUse = inUseStatus[definition.id];
          const hasEvents = eventSchedules.length > 0;
          const eventsExpanded = expandedEvents[definition.id];

          return (
            <div
              key={definition.id}
              className={`bg-white rounded-lg border overflow-hidden transition-opacity ${
                isInUse ? 'border-slate-200' : 'border-slate-300 opacity-60'
              }`}
            >
              <div className={`px-4 py-3 ${definition.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="w-4 h-4" />
                    <h4 className="font-semibold">{definition.display_label}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        definition.source_level === 'store'
                          ? 'bg-blue-600/20 text-blue-900'
                          : definition.source_level === 'concept'
                          ? 'bg-purple-600/20 text-purple-900'
                          : 'bg-slate-600/20 text-slate-900'
                      }`}
                    >
                      {definition.source_level === 'store'
                        ? 'Store'
                        : definition.source_level === 'concept'
                        ? 'Concept'
                        : 'Global'}
                    </span>
                    {hasEvents && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-900 font-medium">
                        <Calendar className="w-3 h-3" />
                        {eventSchedules.length} {eventSchedules.length === 1 ? 'Event' : 'Events'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleInUseStatus(definition.id)}
                      className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${
                        isInUse
                          ? 'bg-green-600/20 text-green-900 hover:bg-green-600/30'
                          : 'bg-slate-600/20 text-slate-900 hover:bg-slate-600/30'
                      }`}
                      title={isInUse ? 'Mark as not in use' : 'Mark as in use'}
                    >
                      {isInUse ? 'In Use' : 'Not In Use'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {definition.is_customized && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditDefinition(definition)}
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

                      {addingScheduleForDef === definition.id && newSchedule && (
                        <div className="px-4 pb-4 bg-slate-50">
                          <div className="pt-4">
                            <ScheduleGroupForm
                              schedule={newSchedule}
                              allSchedules={defSchedules}
                              onUpdate={setNewSchedule}
                              onSave={() => handleSaveSchedule(newSchedule)}
                              onCancel={() => {
                                setAddingScheduleForDef(null);
                                setNewSchedule(null);
                                setIsEventSchedule(false);
                              }}
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
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No daypart schedules yet.</p>
          </div>
        )}

        {definitions.length > 0 && filteredDefinitions.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <EyeOff className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm mb-2">All dayparts are marked as not in use.</p>
            <button
              type="button"
              onClick={() => setShowUnused(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Show all dayparts
            </button>
          </div>
        )}

        {addingScheduleForDef === 'new' && newSchedule && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {isEventSchedule ? 'Add Event/Holiday' : 'Add Schedule'}
            </h3>

            <ScheduleGroupForm
              schedule={newSchedule}
              allSchedules={newSchedule.daypart_definition_id ? schedules.filter(s => s.daypart_definition_id === newSchedule.daypart_definition_id) : []}
              onUpdate={setNewSchedule}
              onSave={() => handleSaveSchedule(newSchedule)}
              onCancel={() => {
                setAddingScheduleForDef(null);
                setNewSchedule(null);
                setIsEventSchedule(false);
                setNewScheduleType(null);
                setSelectedDaypartId('');
              }}
              level="site"
              showDaypartSelector={true}
              availableDayparts={filteredDefinitions.map(d => ({
                id: d.id,
                daypart_name: d.daypart_name,
                display_label: d.display_label,
                source_level: d.source_level
              }))}
              selectedDaypartId={newSchedule.daypart_definition_id || ''}
              onDaypartChange={(daypartId, daypartName) => {
                setSelectedDaypartId(daypartId);
                setNewSchedule(prev => prev ? {
                  ...prev,
                  daypart_definition_id: daypartId,
                  daypart_name: daypartName
                } : null);
              }}
            />
          </div>
        )}

        {!addingScheduleForDef && (
          <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleAddScheduleClick}
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Schedule
          </button>
          <button
            type="button"
            onClick={handleAddEventScheduleClick}
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-300 text-amber-600 rounded-lg hover:border-amber-600 hover:bg-amber-50 transition-colors font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Add Event/Holiday
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 px-1 py-1 border border-slate-300 rounded-lg cursor-pointer"
                  />
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
  );
}
