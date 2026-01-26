import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Edit2, Trash2, AlertCircle, Check, X, Eye, EyeOff, ChevronDown, ChevronRight, Calendar, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconPicker from './IconPicker';
import ScheduleGroupForm from './ScheduleGroupForm';
import { Schedule } from '../hooks/useScheduleCollisionDetection';
import Breadcrumb from './Breadcrumb';

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
  { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
  { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' }
];

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

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
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [editingDefinitionContext, setEditingDefinitionContext] = useState<DaypartDefinition | null>(null);
  const [removedDays, setRemovedDays] = useState<number[]>([]);
  const [showRemovedDaysPrompt, setShowRemovedDaysPrompt] = useState(false);
  const [savedScheduleData, setSavedScheduleData] = useState<{ definitionId: string; schedule: Schedule } | null>(null);

  const [formData, setFormData] = useState({
    daypart_name: '',
    display_label: '',
    description: '',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'Clock',
    sort_order: 0,
  });

  const enrichedSchedules = useMemo(() => {
    return schedules.map(schedule => {
      const definition = definitions.find(d => d.id === schedule.daypart_definition_id);
      return {
        ...schedule,
        daypart_name: definition?.daypart_name
      };
    });
  }, [schedules, definitions]);

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

  const handleCancel = () => {
    setExpandedScheduleId(null);
    setEditingSchedule(null);
    setAddingScheduleForDef(null);
    setNewSchedule(null);
    setEditingDefinitionContext(null);
  };

  const handleAddSchedule = (
    defId: string,
    scheduleType: 'regular' | 'event_holiday' = 'regular',
    preFillDays?: number[],
    templateSchedule?: DaypartSchedule
  ) => {
    const def = definitions.find(d => d.id === defId);
    setNewSchedule({
      daypart_name: def?.daypart_name || '',
      daypart_definition_id: defId,
      days_of_week: preFillDays || [],
      start_time: templateSchedule?.start_time || '06:00',
      end_time: templateSchedule?.end_time || '11:00',
      schedule_type: scheduleType,
    });
    setExpandedScheduleId('new-' + defId);
    setAddingScheduleForDef(defId);
    setEditingSchedule(null);
    setEditingDefinitionContext(def || null);
  };

  const handleEditSchedule = (schedule: DaypartSchedule) => {
    if (expandedScheduleId === schedule.id) {
      handleCancel();
    } else {
      const definition = definitions.find(d => d.id === schedule.daypart_definition_id);
      const scheduleWithDaypartName = {
        ...schedule,
        daypart_name: definition?.daypart_name || schedule.daypart_name || ''
      };
      setExpandedScheduleId(schedule.id!);
      setEditingSchedule(scheduleWithDaypartName);
      setAddingScheduleForDef(null);
      setEditingDefinitionContext(definition || null);
    }
  };

  const handleSaveSchedule = async (scheduleToSave?: Schedule) => {
    const schedule = scheduleToSave || editingSchedule || newSchedule;
    if (!schedule) return;

    try {
      if (editingSchedule) {
        const currentDefinition = definitions.find(d => d.id === editingSchedule.daypart_definition_id);

        if (currentDefinition && !currentDefinition.is_customized && currentDefinition.source_level !== 'store') {
          const allSchedulesForDaypart = schedules.filter(s => s.daypart_definition_id === currentDefinition.id);

          const { data: newDefinition, error: defError } = await supabase
            .from('daypart_definitions')
            .insert([{
              daypart_name: currentDefinition.daypart_name,
              display_label: currentDefinition.display_label,
              color: currentDefinition.color,
              icon: currentDefinition.icon,
              sort_order: currentDefinition.sort_order,
              is_active: true,
              store_id: storeId,
            }])
            .select()
            .single();

          if (defError) throw defError;
          if (!newDefinition) throw new Error('Failed to create store-level daypart');

          const schedulesToCopy = allSchedulesForDaypart.map(s => {
            const baseData: any = {
              daypart_definition_id: newDefinition.id,
              days_of_week: s.id === editingSchedule.id ? schedule.days_of_week : s.days_of_week,
              start_time: s.id === editingSchedule.id ? schedule.start_time : s.start_time,
              end_time: s.id === editingSchedule.id ? schedule.end_time : s.end_time,
            };

            if (s.id === editingSchedule.id) {
              if (schedule.schedule_name !== undefined) baseData.schedule_name = schedule.schedule_name;
              if (schedule.schedule_type) baseData.schedule_type = schedule.schedule_type;
              if (schedule.event_name) baseData.event_name = schedule.event_name;
              if (schedule.event_date) baseData.event_date = schedule.event_date;
              if (schedule.recurrence_type) baseData.recurrence_type = schedule.recurrence_type;
              if (schedule.recurrence_config) baseData.recurrence_config = schedule.recurrence_config;
              if (schedule.runs_on_days !== undefined) baseData.runs_on_days = schedule.runs_on_days;
            } else {
              if (s.schedule_name) baseData.schedule_name = s.schedule_name;
              if (s.schedule_type) baseData.schedule_type = s.schedule_type;
              if (s.event_name) baseData.event_name = s.event_name;
              if (s.event_date) baseData.event_date = s.event_date;
              if (s.recurrence_type) baseData.recurrence_type = s.recurrence_type;
              if (s.recurrence_config) baseData.recurrence_config = s.recurrence_config;
              if (s.runs_on_days !== undefined) baseData.runs_on_days = s.runs_on_days;
            }

            return baseData;
          });

          const { error: schedulesError } = await supabase
            .from('daypart_schedules')
            .insert(schedulesToCopy);

          if (schedulesError) throw schedulesError;

          setSuccess(`Customized ${currentDefinition.display_label} at store level with all schedules`);
        } else {
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
          if (schedule.runs_on_days !== undefined) updateData.runs_on_days = schedule.runs_on_days;

          const { error: updateError } = await supabase
            .from('daypart_schedules')
            .update(updateData)
            .eq('id', editingSchedule.id);

          if (updateError) throw updateError;
        }
      } else if (addingScheduleForDef) {
        const targetDaypartId = addingScheduleForDef;

        if (!targetDaypartId) {
          throw new Error('Please select a daypart');
        }

        const targetDefinition = definitions.find(d => d.id === targetDaypartId);

        if (targetDefinition && !targetDefinition.is_customized && targetDefinition.source_level !== 'store') {
          const allSchedulesForDaypart = schedules.filter(s => s.daypart_definition_id === targetDefinition.id);

          const { data: newDefinition, error: defError } = await supabase
            .from('daypart_definitions')
            .insert([{
              daypart_name: targetDefinition.daypart_name,
              display_label: targetDefinition.display_label,
              color: targetDefinition.color,
              icon: targetDefinition.icon,
              sort_order: targetDefinition.sort_order,
              is_active: true,
              store_id: storeId,
            }])
            .select()
            .single();

          if (defError) throw defError;
          if (!newDefinition) throw new Error('Failed to create store-level daypart');

          const schedulesToCopy = allSchedulesForDaypart.map(s => ({
            daypart_definition_id: newDefinition.id,
            days_of_week: s.days_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            schedule_name: s.schedule_name || undefined,
            schedule_type: s.schedule_type || undefined,
            event_name: s.event_name || undefined,
            event_date: s.event_date || undefined,
            recurrence_type: s.recurrence_type || undefined,
            recurrence_config: s.recurrence_config || undefined,
            runs_on_days: s.runs_on_days !== undefined ? s.runs_on_days : undefined,
          }));

          const newScheduleData: any = {
            daypart_definition_id: newDefinition.id,
            days_of_week: schedule.days_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          };

          if (schedule.schedule_name !== undefined) newScheduleData.schedule_name = schedule.schedule_name;
          if (schedule.schedule_type) newScheduleData.schedule_type = schedule.schedule_type;
          if (schedule.event_name) newScheduleData.event_name = schedule.event_name;
          if (schedule.event_date) newScheduleData.event_date = schedule.event_date;
          if (schedule.recurrence_type) newScheduleData.recurrence_type = schedule.recurrence_type;
          if (schedule.recurrence_config) newScheduleData.recurrence_config = schedule.recurrence_config;
          if (schedule.runs_on_days !== undefined) newScheduleData.runs_on_days = schedule.runs_on_days;

          const allSchedulesToInsert = [...schedulesToCopy, newScheduleData];

          const { error: schedulesError } = await supabase
            .from('daypart_schedules')
            .insert(allSchedulesToInsert);

          if (schedulesError) throw schedulesError;

          setSuccess(`Customized ${targetDefinition.display_label} at store level with all schedules`);
        } else {
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
          if (schedule.runs_on_days !== undefined) insertData.runs_on_days = schedule.runs_on_days;

          const { error: insertError } = await supabase
            .from('daypart_schedules')
            .insert([insertData]);

          if (insertError) throw insertError;
        }
      }

      const hasRemovedDays = removedDays.length > 0;
      const currentEditingSchedule = editingSchedule;

      await loadData();

      if (hasRemovedDays && currentEditingSchedule) {
        const currentDefinition = definitions.find(d => d.id === currentEditingSchedule.daypart_definition_id);

        if (currentDefinition) {
          const { data: allSchedulesForDaypart, error: schedulesError } = await supabase
            .from('placement_daypart_overrides')
            .select('days_of_week')
            .eq('store_id', storeId)
            .eq('daypart_definition_id', currentDefinition.id);

          if (!schedulesError && allSchedulesForDaypart) {
            const coveredDays = new Set<number>();
            allSchedulesForDaypart.forEach(sched => {
              sched.days_of_week.forEach((day: number) => coveredDays.add(day));
            });

            const uncoveredRemovedDays = removedDays.filter(day => !coveredDays.has(day));

            if (uncoveredRemovedDays.length > 0) {
              setSavedScheduleData({
                definitionId: currentDefinition.id,
                schedule: {
                  ...schedule,
                  days_of_week: uncoveredRemovedDays,
                  start_time: currentEditingSchedule.start_time,
                  end_time: currentEditingSchedule.end_time
                }
              });
              setRemovedDays(uncoveredRemovedDays);
              setShowRemovedDaysPrompt(true);
              return;
            }
          }
        }
      }

      setExpandedScheduleId(null);
      setEditingSchedule(null);
      setAddingScheduleForDef(null);
      setNewSchedule(null);
      setEditingDefinitionContext(null);
      setRemovedDays([]);
      await loadData();

      setTimeout(() => setSuccess(null), 3000);
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
      const scheduleToDelete = schedules.find(s => s.id === scheduleId);
      if (!scheduleToDelete) throw new Error('Schedule not found');

      const currentDefinition = definitions.find(d => d.id === scheduleToDelete.daypart_definition_id);

      if (currentDefinition && !currentDefinition.is_customized && currentDefinition.source_level !== 'store') {
        const allSchedulesForDaypart = schedules.filter(s => s.daypart_definition_id === currentDefinition.id);

        const { data: newDefinition, error: defError } = await supabase
          .from('daypart_definitions')
          .insert([{
            daypart_name: currentDefinition.daypart_name,
            display_label: currentDefinition.display_label,
            color: currentDefinition.color,
            icon: currentDefinition.icon,
            sort_order: currentDefinition.sort_order,
            is_active: true,
            store_id: storeId,
          }])
          .select()
          .single();

        if (defError) throw defError;
        if (!newDefinition) throw new Error('Failed to create store-level daypart');

        const schedulesToCopy = allSchedulesForDaypart
          .filter(s => s.id !== scheduleId)
          .map(s => ({
            daypart_definition_id: newDefinition.id,
            days_of_week: s.days_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            schedule_name: s.schedule_name || undefined,
            schedule_type: s.schedule_type || undefined,
            event_name: s.event_name || undefined,
            event_date: s.event_date || undefined,
            recurrence_type: s.recurrence_type || undefined,
            recurrence_config: s.recurrence_config || undefined,
          }));

        if (schedulesToCopy.length > 0) {
          const { error: schedulesError } = await supabase
            .from('daypart_schedules')
            .insert(schedulesToCopy);

          if (schedulesError) throw schedulesError;
        }

        setSuccess(`Customized ${currentDefinition.display_label} at store level and removed schedule`);
      } else {
        const { error: deleteError } = await supabase
          .from('daypart_schedules')
          .delete()
          .eq('id', scheduleId);

        if (deleteError) throw deleteError;
      }

      setExpandedScheduleId(null);
      setEditingSchedule(null);
      setEditingDefinitionContext(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
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

  const handleScheduleRemovedDays = () => {
    if (savedScheduleData) {
      const def = definitions.find(d => d.id === savedScheduleData.definitionId);
      handleAddSchedule(
        savedScheduleData.definitionId,
        'regular',
        removedDays,
        savedScheduleData.schedule as DaypartSchedule
      );
      setShowRemovedDaysPrompt(false);
      setSavedScheduleData(null);
      setRemovedDays([]);
    }
  };

  const handleSkipRemovedDays = () => {
    setShowRemovedDaysPrompt(false);
    setSavedScheduleData(null);
    setRemovedDays([]);
  };

  const formatRemovedDays = (): string => {
    const dayLabels = [
      { value: 0, label: 'Sunday' },
      { value: 1, label: 'Monday' },
      { value: 2, label: 'Tuesday' },
      { value: 3, label: 'Wednesday' },
      { value: 4, label: 'Thursday' },
      { value: 5, label: 'Friday' },
      { value: 6, label: 'Saturday' }
    ];
    return removedDays
      .map(day => dayLabels.find(d => d.value === day)?.label || '')
      .filter(Boolean)
      .join(', ');
  };

  const filteredDefinitions = definitions.filter(def =>
    showUnused || inUseStatus[def.id]
  );

  // Helper to render inline edit form
  const renderInlineEditForm = (scheduleId: string | null) => {
    if (!scheduleId || expandedScheduleId !== scheduleId) return null;

    const currentSchedule = editingSchedule || newSchedule;
    if (!currentSchedule) return null;

    const currentDefinition = editingDefinitionContext || (currentSchedule && 'daypart_definition_id' in currentSchedule
      ? definitions.find(d => d.id === currentSchedule.daypart_definition_id)
      : null);

    const canDelete = editingSchedule?.id && currentDefinition?.source_level === 'store';

    return (
      <div className="mb-3">
        <ScheduleGroupForm
          schedule={currentSchedule!}
          allSchedules={enrichedSchedules}
          onUpdate={(updated) => {
            if (editingSchedule) {
              setEditingSchedule(updated as DaypartSchedule);
            } else {
              setNewSchedule(updated);
            }
          }}
          onSave={handleSaveSchedule}
          onCancel={handleCancel}
          onDelete={canDelete ? handleDeleteSchedule : undefined}
          onRemovedDays={setRemovedDays}
          level="site"
          skipDayValidation={false}
          disableCollisionDetection={false}
          daypartColor={currentDefinition?.color}
        />
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

      <div className="space-y-5 mb-6">
        {filteredDefinitions.map((definition) => {
          const defSchedules = schedules
            .filter(s => s.daypart_definition_id === definition.id)
            .map(s => ({ ...s, daypart_name: definition.daypart_name }));
          const regularSchedules = defSchedules.filter(s => s.schedule_type !== 'event_holiday');
          const eventSchedules = defSchedules.filter(s => s.schedule_type === 'event_holiday');
          const isInUse = inUseStatus[definition.id];
          const hasEvents = eventSchedules.length > 0;
          const eventsExpanded = expandedEvents[definition.id];

          const scheduledDays = new Set<number>();
          regularSchedules.forEach(schedule => {
            schedule.days_of_week.forEach(day => scheduledDays.add(day));
          });
          const allDays = [0, 1, 2, 3, 4, 5, 6];
          const unscheduledDays = allDays.filter(day => !scheduledDays.has(day));
          const hasUnscheduledDays = unscheduledDays.length > 0;

          if (addingScheduleForDef === definition.id && newSchedule) {
            return (
              <div key={definition.id} className={`bg-white rounded-xl border-2 overflow-hidden transition-opacity ${
                isInUse ? 'border-slate-200 shadow-sm' : 'border-slate-300 opacity-60'
              }`}>
                <div className={`px-4 py-3 border-b border-slate-200 ${definition.color}`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <h4 className="font-semibold">{definition.display_label}</h4>
                  </div>
                </div>
                <div className="px-4 pb-4 bg-slate-50">
                  <div className="pt-4">
                    <ScheduleGroupForm
                      schedule={newSchedule}
                      allSchedules={defSchedules}
                      onUpdate={setNewSchedule}
                      onSave={handleSaveSchedule}
                      onCancel={() => {
                        setAddingScheduleForDef(null);
                        setNewSchedule(null);
                      }}
                      onRemovedDays={setRemovedDays}
                      level="site"
                      daypartColor={definition.color}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={definition.id}>
              {regularSchedules.length === 0 && !hasEvents ? (
                <div
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-opacity shadow-sm hover:shadow-md ${
                    isInUse ? 'border-slate-200' : 'border-slate-300 opacity-60'
                  }`}
                >
                  <div className={`px-4 py-3 border-b border-slate-200 ${definition.color}`}>
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
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600 text-sm">
                        No schedules configured for this daypart.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSchedule(definition.id, 'event_holiday')}
                      className="w-full p-3 border-2 border-dashed rounded-lg transition-all flex items-center justify-center gap-2"
                      style={{
                        borderColor: 'rgba(222, 56, 222, 0.3)',
                        color: 'rgb(156, 39, 176)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(222, 56, 222, 0.5)';
                        e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(222, 56, 222, 0.3)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Add Event/Holiday
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`bg-white rounded-xl border-2 overflow-hidden transition-opacity shadow-sm hover:shadow-md ${
                  isInUse ? 'border-slate-200' : 'border-slate-300 opacity-60'
                }`}>
                  <div className={`px-4 py-3 border-b border-slate-200 ${definition.color}`}>
                    <div className="flex items-center gap-2">
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
                      {hasEvents && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(222, 56, 222, 0.15)', color: 'rgb(156, 39, 176)' }}>
                          <Calendar className="w-3 h-3" />
                          {eventSchedules.length} {eventSchedules.length === 1 ? 'Event' : 'Events'}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1">
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
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    {regularSchedules.map((schedule) => (
                      <div key={schedule.id}>
                        {expandedScheduleId === schedule.id ? (
                          renderInlineEditForm(schedule.id)
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEditSchedule(schedule)}
                            className="w-full p-4 rounded-xl border transition-all hover:shadow-md shadow-sm text-left group border-slate-200 bg-white hover:bg-blue-50 active:bg-blue-100 hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex gap-1 mb-2">
                                  {DAYS_OF_WEEK.map((day) => {
                                    const isActive = schedule.days_of_week.includes(day.value);
                                    const bgColor = definition.color.match(/bg-(\w+)-\d+/)?.[0] || 'bg-slate-100';
                                    const textColor = bgColor.replace('bg-', 'text-').replace('-100', '-700');
                                    return (
                                      <div
                                        key={day.value}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                          isActive
                                            ? `${bgColor} ${textColor}`
                                            : 'bg-slate-100 text-slate-400'
                                        }`}
                                        title={day.label}
                                      >
                                        {day.letter}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {schedule.runs_on_days === false
                                      ? 'Does Not Run'
                                      : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1 group-hover:text-slate-600 transition-colors" />
                            </div>
                          </button>
                        )}
                      </div>
                    ))}

                    {regularSchedules.length > 0 && (
                      <div className={`mx-3 mb-3 mt-3 grid ${hasUnscheduledDays ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                        {hasUnscheduledDays && (
                          <button
                            type="button"
                            onClick={() => {
                              const template = regularSchedules[0];
                              handleAddSchedule(definition.id, 'regular', unscheduledDays, template);
                            }}
                            className="p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4 text-slate-700" />
                            <span className="text-sm font-medium text-slate-700">
                              Add Missing Days ({unscheduledDays.length})
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddSchedule(definition.id, 'event_holiday')}
                          className="p-3 border-2 border-dashed rounded-lg transition-all flex items-center justify-center gap-2"
                          style={{
                            borderColor: 'rgba(222, 56, 222, 0.3)',
                            color: 'rgb(156, 39, 176)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(222, 56, 222, 0.5)';
                            e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(222, 56, 222, 0.3)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Add Event/Holiday
                          </span>
                        </button>
                      </div>
                    )}

                    {renderInlineEditForm('new-' + definition.id)}

                    {hasEvents && (
                      <div className="mx-3 mb-3 mt-2 rounded-lg overflow-hidden" style={{ border: '2px solid rgba(222, 56, 222, 0.2)', backgroundColor: 'rgba(222, 56, 222, 0.03)' }}>
                        <button
                          type="button"
                          onClick={() => toggleEventsExpanded(definition.id)}
                          className="w-full px-4 py-3 transition-colors flex items-center justify-between group"
                          style={{ backgroundColor: 'rgba(222, 56, 222, 0.08)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.08)'}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" style={{ color: 'rgb(156, 39, 176)' }} />
                            <span className="text-sm md:text-base font-medium" style={{ color: 'rgb(156, 39, 176)' }}>
                              Event & Holiday Schedules
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(222, 56, 222, 0.15)', color: 'rgb(156, 39, 176)' }}>
                              {eventSchedules.length}
                            </span>
                          </div>
                          {eventsExpanded ? (
                            <ChevronDown className="w-5 h-5" style={{ color: 'rgb(156, 39, 176)' }} />
                          ) : (
                            <ChevronRight className="w-5 h-5" style={{ color: 'rgb(156, 39, 176)' }} />
                          )}
                        </button>

                        {eventsExpanded && (
                          <div className="divide-y" style={{ borderColor: 'rgba(222, 56, 222, 0.1)' }}>
                            {eventSchedules.map((schedule) => (
                              <div key={schedule.id}>
                                <button
                                  type="button"
                                  onClick={() => handleEditSchedule(schedule)}
                                  className={`w-full p-4 transition-colors text-left ${
                                    expandedScheduleId === schedule.id
                                      ? 'border-l-4 border-blue-500 bg-blue-50'
                                      : ''
                                  }`}
                                  style={{ backgroundColor: expandedScheduleId === schedule.id ? undefined : 'transparent' }}
                                  onMouseEnter={(e) => {
                                    if (expandedScheduleId !== schedule.id) {
                                      e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.08)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (expandedScheduleId !== schedule.id) {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="font-medium" style={{ color: 'rgb(156, 39, 176)' }}>
                                          {schedule.event_name || 'Unnamed Event'}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: 'rgba(222, 56, 222, 0.15)', color: 'rgb(156, 39, 176)' }}>
                                          {schedule.recurrence_type === 'none' ? 'One-time' :
                                           schedule.recurrence_type === 'annual_date' ? 'Annual' :
                                           schedule.recurrence_type === 'monthly_date' ? 'Monthly' :
                                           schedule.recurrence_type === 'annual_relative' ? 'Annual (relative)' :
                                           schedule.recurrence_type === 'annual_date_range' ? 'Annual range' : 'Unknown'}
                                        </span>
                                      </div>
                                      <div className="text-sm mb-2" style={{ color: 'rgb(156, 39, 176)' }}>
                                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                        {schedule.event_date && (() => {
                                          const date = new Date(schedule.event_date + 'T00:00:00');
                                          const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                                          if (schedule.recurrence_type === 'none') {
                                            options.year = 'numeric';
                                          }
                                          return date.toLocaleDateString('en-US', options);
                                        })()}
                                        <span className="mx-2" style={{ color: 'rgba(222, 56, 222, 0.4)' }}>•</span>
                                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                                        {schedule.runs_on_days === false
                                          ? 'Does Not Run'
                                          : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                                      </div>
                                      {schedule.days_of_week.length > 0 && (
                                        <div className="flex gap-1">
                                          {DAYS_OF_WEEK.map((day) => {
                                            const isActive = schedule.days_of_week.includes(day.value);
                                            const bgColor = definition.color.match(/bg-(\w+)-\d+/)?.[0] || 'bg-slate-100';
                                            const textColor = bgColor.replace('bg-', 'text-').replace('-100', '-700');
                                            return (
                                              <div
                                                key={day.value}
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                  isActive
                                                    ? `${bgColor} ${textColor}`
                                                    : 'bg-slate-100 text-slate-400'
                                                }`}
                                                title={day.label}
                                              >
                                                {day.letter}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                    <ChevronRight className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: 'rgba(156, 39, 176, 0.4)' }} />
                                  </div>
                                </button>
                                {renderInlineEditForm(schedule.id)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {definitions.length === 0 && (
          <div className="text-center py-4 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No daypart schedules yet.</p>
          </div>
        )}

        {definitions.length > 0 && filteredDefinitions.length === 0 && (
          <div className="text-center py-4 text-slate-500">
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

      {showRemovedDaysPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Schedule Removed Days?
                  </h3>
                  <p className="text-sm text-slate-600">
                    You removed {formatRemovedDays()} from this schedule. Would you like to create a new schedule for these days, or leave them unscheduled?
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleScheduleRemovedDays}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Create New Schedule for These Days
                </button>
                <button
                  onClick={handleSkipRemovedDays}
                  className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                >
                  Leave Unscheduled
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
