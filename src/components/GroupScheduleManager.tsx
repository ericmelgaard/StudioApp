import { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, ChevronRight, ChevronDown, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ScheduleGroupForm from './ScheduleGroupForm';

interface GroupScheduleManagerProps {
  groupId: string;
  groupName: string;
}

interface Schedule {
  id: string;
  daypart_definition_id: string;
  placement_group_id: string;
  days_of_week: number[];
  start_time: string;
  end_time?: string;
  runs_on_days?: boolean;
  schedule_name?: string;
  schedule_type?: 'regular' | 'event_holiday';
  event_name?: string;
  event_date?: string;
  recurrence_type?: string;
}

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string;
  sort_order: number;
}

interface EffectiveSchedule extends Schedule {
  is_inherited: boolean;
  daypart_name: string;
  daypart_definition: DaypartDefinition;
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

export default function GroupScheduleManager({ groupId, groupName }: GroupScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [inheritedSchedules, setInheritedSchedules] = useState<EffectiveSchedule[]>([]);
  const [daypartDefinitions, setDaypartDefinitions] = useState<DaypartDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [inheritedSectionExpanded, setInheritedSectionExpanded] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editingDaypartName, setEditingDaypartName] = useState<string | null>(null);
  const [isInheritedEdit, setIsInheritedEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    setLoading(true);

    try {
      const placementResult = await supabase
        .from('placement_groups')
        .select('store_id')
        .eq('id', groupId)
        .single();

      if (placementResult.error || !placementResult.data?.store_id) {
        console.error('Error loading placement:', placementResult.error);
        setLoading(false);
        return;
      }

      const storeIdValue = placementResult.data.store_id;

      const defsResult = await supabase.rpc('get_effective_daypart_definitions', {
        p_store_id: storeIdValue
      });

      if (defsResult.error) {
        console.error('Error loading daypart definitions:', defsResult.error);
        setLoading(false);
        return;
      }

      const definitions = defsResult.data || [];
      setDaypartDefinitions(definitions);

      const schedulesResult = await supabase
        .from('placement_daypart_overrides')
        .select('*')
        .eq('placement_group_id', groupId);

      const placementSchedules = schedulesResult.data || [];
      setSchedules(placementSchedules);

      const defIds = definitions.map((d: DaypartDefinition) => d.id);
      const storeSchedulesResult = await supabase
        .from('daypart_schedules')
        .select('*')
        .in('daypart_definition_id', defIds);

      const storeSchedules = storeSchedulesResult.data || [];

      const customizationMap = new Map<string, Schedule>();
      const daypartCustomizations = new Map<string, boolean>();

      console.log('=== PLACEMENT SCHEDULES FOR', groupName, '===');
      placementSchedules.forEach(custom => {
        const def = definitions.find((d: DaypartDefinition) => d.id === custom.daypart_definition_id);
        if (def) {
          const key = `${def.daypart_name}_${custom.schedule_type || 'regular'}_${custom.event_date || ''}_${custom.schedule_name || ''}`;
          console.log('  Placement schedule:', def.daypart_name, 'key:', key, 'schedule:', custom);
          customizationMap.set(key, custom);

          const daypartKey = `${def.daypart_name}_${custom.schedule_type || 'regular'}_${custom.event_date || ''}`;
          daypartCustomizations.set(daypartKey, true);
        }
      });

      console.log('=== STORE SCHEDULES ===');
      const inherited: EffectiveSchedule[] = [];
      storeSchedules.forEach((schedule: any) => {
        const definition = definitions.find((d: DaypartDefinition) => d.id === schedule.daypart_definition_id);
        if (!definition) return;

        const key = `${definition.daypart_name}_${schedule.schedule_type || 'regular'}_${schedule.event_date || ''}_${schedule.schedule_name || ''}`;
        const daypartKey = `${definition.daypart_name}_${schedule.schedule_type || 'regular'}_${schedule.event_date || ''}`;

        const hasExactMatch = customizationMap.has(key);
        const hasDaypartCustomization = daypartCustomizations.has(daypartKey);

        console.log('  Store schedule:', definition.daypart_name, 'key:', key);
        console.log('    exact match:', hasExactMatch, 'daypart customized:', hasDaypartCustomization);

        if (!hasExactMatch && !hasDaypartCustomization) {
          console.log('    -> Marked as INHERITED');
          inherited.push({
            ...schedule,
            is_inherited: true,
            daypart_name: definition.daypart_name,
            daypart_definition: definition,
            schedule_type: schedule.schedule_type || 'regular'
          });
        } else {
          console.log('    -> SKIPPED (placement has this daypart customized)');
        }
      });

      console.log('=== FINAL INHERITED COUNT:', inherited.length, '===');

      setInheritedSchedules(inherited);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInherited = (schedule: EffectiveSchedule) => {
    const newSchedule: Schedule = {
      id: '',
      daypart_definition_id: schedule.daypart_definition_id,
      placement_group_id: groupId,
      days_of_week: schedule.days_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      runs_on_days: schedule.runs_on_days,
      schedule_name: schedule.schedule_name,
      schedule_type: schedule.schedule_type
    };
    setEditingSchedule(newSchedule);
    setEditingDaypartName(schedule.daypart_name);
    setIsInheritedEdit(true);
  };

  const handleEditSchedule = (schedule: Schedule, daypartName: string) => {
    setEditingSchedule(schedule);
    setEditingDaypartName(daypartName);
    setIsInheritedEdit(false);
  };

  const handleAddNew = (
    daypartName?: string,
    daysOfWeek?: number[],
    scheduleType: 'regular' | 'event_holiday' = 'regular',
    template?: Schedule
  ) => {
    const definition = daypartDefinitions.find(d => d.daypart_name === daypartName);
    if (!definition) return;

    const newSchedule: Schedule = {
      id: '',
      daypart_definition_id: definition.id,
      placement_group_id: groupId,
      days_of_week: daysOfWeek || [],
      start_time: template?.start_time || '09:00:00',
      end_time: template?.end_time || '17:00:00',
      runs_on_days: true,
      schedule_name: template?.schedule_name,
      schedule_type: scheduleType
    };

    setEditingSchedule(newSchedule);
    setEditingDaypartName(daypartName || null);
    setIsInheritedEdit(false);
  };

  const handleSave = async (schedule: Schedule) => {
    try {
      if (schedule.id) {
        const { error } = await supabase
          .from('placement_daypart_overrides')
          .update({
            days_of_week: schedule.days_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            runs_on_days: schedule.runs_on_days,
            schedule_name: schedule.schedule_name,
            schedule_type: schedule.schedule_type,
            event_name: schedule.event_name,
            event_date: schedule.event_date,
            recurrence_type: schedule.recurrence_type,
            recurrence_config: schedule.recurrence_config,
            priority_level: schedule.priority_level
          })
          .eq('id', schedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('placement_daypart_overrides')
          .insert({
            placement_group_id: groupId,
            daypart_definition_id: schedule.daypart_definition_id,
            days_of_week: schedule.days_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            runs_on_days: schedule.runs_on_days,
            schedule_name: schedule.schedule_name,
            schedule_type: schedule.schedule_type,
            event_name: schedule.event_name,
            event_date: schedule.event_date,
            recurrence_type: schedule.recurrence_type,
            recurrence_config: schedule.recurrence_config,
            priority_level: schedule.priority_level
          });

        if (error) throw error;
      }

      setEditingSchedule(null);
      setEditingDaypartName(null);
      setIsInheritedEdit(false);
      await loadData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('placement_daypart_overrides')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      setEditingSchedule(null);
      setEditingDaypartName(null);
      setIsInheritedEdit(false);
      await loadData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    setEditingSchedule(null);
    setEditingDaypartName(null);
    setIsInheritedEdit(false);
  };

  const regularSchedules = schedules.filter(s => s.schedule_type !== 'event_holiday');
  const eventSchedules = schedules.filter(s => s.schedule_type === 'event_holiday');

  const groupedSchedules = regularSchedules.reduce((acc, schedule) => {
    const def = daypartDefinitions.find(d => d.id === schedule.daypart_definition_id);
    if (!def) return acc;
    if (!acc[def.daypart_name]) {
      acc[def.daypart_name] = [];
    }
    acc[def.daypart_name].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  const groupedEvents = eventSchedules.reduce((acc, schedule) => {
    const def = daypartDefinitions.find(d => d.id === schedule.daypart_definition_id);
    if (!def) return acc;
    if (!acc[def.daypart_name]) {
      acc[def.daypart_name] = [];
    }
    acc[def.daypart_name].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  const inheritedRegular = inheritedSchedules.filter(s => s.schedule_type !== 'event_holiday');
  const inheritedEvents = inheritedSchedules.filter(s => s.schedule_type === 'event_holiday');

  const groupedInheritedSchedules = inheritedRegular.reduce((acc, schedule) => {
    if (!acc[schedule.daypart_name]) {
      acc[schedule.daypart_name] = [];
    }
    acc[schedule.daypart_name].push(schedule);
    return acc;
  }, {} as Record<string, EffectiveSchedule[]>);

  const groupedInheritedEvents = inheritedEvents.reduce((acc, schedule) => {
    if (!acc[schedule.daypart_name]) {
      acc[schedule.daypart_name] = [];
    }
    acc[schedule.daypart_name].push(schedule);
    return acc;
  }, {} as Record<string, EffectiveSchedule[]>);

  const allDayparts = daypartDefinitions
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(d => d.daypart_name);

  const toggleEventsExpanded = (daypartName: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [daypartName]: !prev[daypartName]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-3 border-slate-200 dark:border-slate-600 border-t-cyan-600 dark:border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Placement Schedules
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure daypart hours and event/holiday schedules for this placement.
        </p>
      </div>

      {schedules.length === 0 && inheritedSchedules.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
          <Clock className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Daypart Schedules Configured</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm px-4">
            Configure daypart schedules at the store level first
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {allDayparts.map((daypartName) => {
            const daypartSchedules = groupedSchedules[daypartName] || [];
            const daypartEvents = groupedEvents[daypartName] || [];
            const hasCustom = daypartSchedules.length > 0 || daypartEvents.length > 0;

            if (!hasCustom) return null;

            const hasEvents = daypartEvents.length > 0;
            const eventsExpanded = expandedEvents[daypartName];
            const definition = daypartDefinitions.find(d => d.daypart_name === daypartName);
            if (!definition) return null;
            const displayLabel = definition.display_label;
            const colorClass = definition.color;

            return (
              <div key={daypartName} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${colorClass}`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <h4 className="font-semibold">{displayLabel}</h4>
                    {hasEvents && (
                      <span className="hidden md:flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(222, 56, 222, 0.15)', color: 'rgb(156, 39, 176)' }}>
                        <Calendar className="w-3 h-3" />
                        {daypartEvents.length} Event{daypartEvents.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  {daypartSchedules.map((schedule) => {
                    const isEditing = editingSchedule?.id === schedule.id && editingDaypartName === daypartName;

                    if (isEditing) {
                      return (
                        <div key={schedule.id} className="bg-blue-50 dark:bg-slate-700/50 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                          <div className="flex items-center justify-end mb-4">
                            <button
                              onClick={handleCancel}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            >
                              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                          </div>
                          <ScheduleGroupForm
                            schedule={{ ...editingSchedule, daypart_name: daypartName }}
                            allSchedules={schedules}
                            onUpdate={setEditingSchedule}
                            onSave={() => handleSave(editingSchedule!)}
                            onCancel={handleCancel}
                            onDelete={editingSchedule.id ? handleDelete : undefined}
                            level="placement"
                          />
                        </div>
                      );
                    }

                    return (
                      <button
                        key={schedule.id}
                        onClick={() => handleEditSchedule(schedule, daypartName)}
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 active:bg-blue-100 dark:active:bg-slate-600 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] shadow-sm text-left group"
                      >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-1 mb-2">
                            {DAYS_OF_WEEK.map((day) => {
                              const isActive = schedule.days_of_week.includes(day.value);
                              const bgColor = colorClass.match(/bg-(\w+)-\d+/)?.[0] || 'bg-slate-100';
                              const textColor = bgColor.replace('bg-', 'text-').replace('-100', '-700');
                              return (
                                <div
                                  key={day.value}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    isActive
                                      ? `${bgColor} ${textColor}`
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                  }`}
                                  title={day.label}
                                >
                                  {day.letter}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              {schedule.runs_on_days === false
                                ? 'Does Not Run'
                                : `${formatTime(schedule.start_time)} - ${schedule.end_time ? formatTime(schedule.end_time) : ''}`}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                      </div>
                    </button>
                    );
                  })}

                  {editingSchedule && !editingSchedule.id && editingDaypartName === daypartName && editingSchedule.schedule_type === 'regular' ? (
                    <div className="bg-blue-50 dark:bg-slate-700/50 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-slate-900 dark:text-slate-100">Add Schedule</h5>
                        <button
                          onClick={handleCancel}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                      </div>
                      <ScheduleGroupForm
                        schedule={{ ...editingSchedule, daypart_name: daypartName }}
                        allSchedules={schedules}
                        onUpdate={setEditingSchedule}
                        onSave={() => handleSave(editingSchedule!)}
                        onCancel={handleCancel}
                        level="placement"
                      />
                    </div>
                  ) : (
                    daypartSchedules.length > 0 && (() => {
                      const scheduledDays = new Set<number>();
                      daypartSchedules.forEach(schedule => {
                        schedule.days_of_week.forEach(day => scheduledDays.add(day));
                      });
                      const allDays = [0, 1, 2, 3, 4, 5, 6];
                      const unscheduledDays = allDays.filter(day => !scheduledDays.has(day));
                      const hasUnscheduledDays = unscheduledDays.length > 0;

                      return (
                        <div className="mx-3 mb-3 flex flex-wrap gap-3">
                          {hasUnscheduledDays && (
                            <button
                              onClick={() => {
                                const template = daypartSchedules[0];
                                handleAddNew(daypartName, unscheduledDays, 'regular', template);
                              }}
                              className="flex-1 min-w-[220px] p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                              <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">
                                Schedule Remaining Days ({unscheduledDays.length})
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => handleAddNew(daypartName, [], 'event_holiday')}
                            className="hidden md:flex flex-1 min-w-[180px] p-3 border-2 border-dashed rounded-lg transition-all items-center justify-center gap-2"
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
                            <span className="text-xs md:text-sm font-medium">
                              Add Event/Holiday
                            </span>
                          </button>
                        </div>
                      );
                    })()
                  )}

                  {hasEvents && (
                    <div className="hidden md:block mx-3 mb-3 mt-2 rounded-lg overflow-hidden" style={{ border: '2px solid rgba(222, 56, 222, 0.2)', backgroundColor: 'rgba(222, 56, 222, 0.03)' }}>
                      <button
                        type="button"
                        onClick={() => toggleEventsExpanded(daypartName)}
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
                            {daypartEvents.length}
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
                          {daypartEvents.map((schedule) => {
                            const isEditing = editingSchedule?.id === schedule.id && editingDaypartName === daypartName;

                            if (isEditing) {
                              return (
                                <div key={schedule.id} className="p-4" style={{ backgroundColor: 'rgba(222, 56, 222, 0.08)' }}>
                                  <div className="flex items-center justify-between mb-4">
                                    <h5 className="font-semibold" style={{ color: 'rgb(156, 39, 176)' }}>Edit Event</h5>
                                    <button
                                      onClick={handleCancel}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                                    >
                                      <X className="w-4 h-4" style={{ color: 'rgb(156, 39, 176)' }} />
                                    </button>
                                  </div>
                                  <ScheduleGroupForm
                                    schedule={{ ...editingSchedule, daypart_name: daypartName }}
                                    allSchedules={schedules}
                                    onUpdate={setEditingSchedule}
                                    onSave={() => handleSave(editingSchedule!)}
                                    onCancel={handleCancel}
                                    onDelete={editingSchedule.id ? handleDelete : undefined}
                                    level="placement"
                                  />
                                </div>
                              );
                            }

                            return (
                              <div key={schedule.id}>
                                <button
                                  onClick={() => handleEditSchedule(schedule, daypartName)}
                                  className="w-full p-4 transition-colors text-left"
                                  style={{ backgroundColor: 'transparent' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.08)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="font-medium" style={{ color: 'rgb(156, 39, 176)' }}>
                                          {schedule.event_name || 'Unnamed Event'}
                                        </span>
                                      </div>
                                      <div className="text-sm mb-2" style={{ color: 'rgb(156, 39, 176)' }}>
                                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                                        {schedule.runs_on_days === false
                                          ? 'Does Not Run'
                                          : `${formatTime(schedule.start_time)} - ${schedule.end_time ? formatTime(schedule.end_time) : ''}`}
                                      </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: 'rgba(156, 39, 176, 0.4)' }} />
                                  </div>
                                </button>
                              </div>
                            );
                          })}

                          {editingSchedule && !editingSchedule.id && editingDaypartName === daypartName && editingSchedule.schedule_type === 'event_holiday' && (
                            <div className="p-4" style={{ backgroundColor: 'rgba(222, 56, 222, 0.08)' }}>
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-semibold" style={{ color: 'rgb(156, 39, 176)' }}>Add Event</h5>
                                <button
                                  onClick={handleCancel}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                                >
                                  <X className="w-4 h-4" style={{ color: 'rgb(156, 39, 176)' }} />
                                </button>
                              </div>
                              <ScheduleGroupForm
                                schedule={{ ...editingSchedule, daypart_name: daypartName }}
                                allSchedules={schedules}
                                onUpdate={setEditingSchedule}
                                onSave={() => handleSave(editingSchedule!)}
                                onCancel={handleCancel}
                                level="placement"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {inheritedSchedules.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setInheritedSectionExpanded(!inheritedSectionExpanded)}
                className="w-full px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Store Dayparts
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
                    {allDayparts.filter(dp => {
                      const hasCustom = (groupedSchedules[dp]?.length || 0) + (groupedEvents[dp]?.length || 0) > 0;
                      const hasInherited = (groupedInheritedSchedules[dp]?.length || 0) + (groupedInheritedEvents[dp]?.length || 0) > 0;
                      return !hasCustom && hasInherited;
                    }).length}
                  </span>
                </div>
                {inheritedSectionExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                )}
              </button>

              {inheritedSectionExpanded && (
                <div className="p-4 space-y-5">
                  {allDayparts.map((daypartName) => {
                    const daypartSchedules = groupedSchedules[daypartName] || [];
                    const daypartEvents = groupedEvents[daypartName] || [];
                    const daypartInheritedSchedules = groupedInheritedSchedules[daypartName] || [];
                    const daypartInheritedEvents = groupedInheritedEvents[daypartName] || [];
                    const hasCustom = daypartSchedules.length > 0 || daypartEvents.length > 0;
                    const hasInherited = daypartInheritedSchedules.length > 0 || daypartInheritedEvents.length > 0;

                    if (hasCustom || !hasInherited) return null;

                    const definition = daypartDefinitions.find(d => d.daypart_name === daypartName);
                    if (!definition) return null;
                    const displayLabel = definition.display_label;
                    const colorClass = definition.color;

                    return (
                      <div key={daypartName} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${colorClass}`}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <h4 className="font-semibold">{displayLabel}</h4>
                          </div>
                        </div>
                        <div className="p-3 space-y-3">
                          {daypartInheritedSchedules.map((schedule) => (
                            <button
                              key={schedule.id}
                              onClick={() => handleEditInherited(schedule)}
                              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 active:bg-blue-100 dark:active:bg-slate-600 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] shadow-sm text-left opacity-75 dark:opacity-60 group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex gap-1 mb-2">
                                    {DAYS_OF_WEEK.map((day) => {
                                      const isActive = schedule.days_of_week.includes(day.value);
                                      const bgColor = colorClass.match(/bg-(\w+)-\d+/)?.[0] || 'bg-slate-100';
                                      const textColor = bgColor.replace('bg-', 'text-').replace('-100', '-700');
                                      return (
                                        <div
                                          key={day.value}
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                            isActive
                                              ? `${bgColor} ${textColor}`
                                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                          }`}
                                          title={day.label}
                                        >
                                          {day.letter}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {schedule.runs_on_days === false
                                        ? 'Does Not Run'
                                        : `${formatTime(schedule.start_time)} - ${schedule.end_time ? formatTime(schedule.end_time) : ''}`}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
