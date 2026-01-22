import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, AlertCircle, Calendar, ChevronDown, ChevronRight, Sparkles, X, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DaypartRoutineForm, { DaypartRoutine } from './DaypartRoutineForm';

interface PlacementDaypartOverridesProps {
  placementGroupId: string;
}

interface SiteRoutine extends DaypartRoutine {
  is_inherited: boolean;
}

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string;
  sort_order: number;
}

interface DaypartSchedule {
  id: string;
  daypart_definition_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  schedule_name?: string;
  runs_on_days?: boolean;
  schedule_type?: 'regular' | 'event_holiday';
  event_name?: string;
  event_date?: string;
  recurrence_type?: string;
}

interface EffectiveSchedule extends DaypartSchedule {
  is_inherited: boolean;
  daypart_name: string;
  daypart_definition: DaypartDefinition;
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

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function PlacementDaypartOverrides({ placementGroupId }: PlacementDaypartOverridesProps) {
  const [routines, setRoutines] = useState<DaypartRoutine[]>([]);
  const [effectiveSchedules, setEffectiveSchedules] = useState<EffectiveSchedule[]>([]);
  const [daypartDefinitions, setDaypartDefinitions] = useState<DaypartDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<DaypartRoutine | null>(null);
  const [editingInherited, setEditingInherited] = useState<EffectiveSchedule | null>(null);
  const [preFillDaypart, setPreFillDaypart] = useState<string | undefined>(undefined);
  const [preFillScheduleType, setPreFillScheduleType] = useState<'regular' | 'event_holiday'>('regular');
  const [storeId, setStoreId] = useState<number | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [placementGroupId]);

  const loadData = async () => {
    setLoading(true);

    try {
      // Get placement's store_id
      const placementResult = await supabase
        .from('placement_groups')
        .select('store_id')
        .eq('id', placementGroupId)
        .single();

      if (placementResult.error || !placementResult.data?.store_id) {
        console.error('Error loading placement:', placementResult.error);
        setLoading(false);
        return;
      }

      const storeIdValue = placementResult.data.store_id;
      setStoreId(storeIdValue);

      // Load daypart definitions for this store
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

      // Load inherited schedules from daypart_schedules
      const defIds = definitions.map((d: DaypartDefinition) => d.id);
      const schedulesResult = await supabase
        .from('daypart_schedules')
        .select('*')
        .in('daypart_definition_id', defIds);

      const inheritedSchedules = schedulesResult.data || [];

      // Load placement customizations
      const routinesResult = await supabase
        .from('placement_daypart_overrides')
        .select('*')
        .eq('placement_group_id', placementGroupId);

      const customizations = routinesResult.data || [];
      setRoutines(customizations);

      // Combine inherited and customized schedules
      const combined: EffectiveSchedule[] = [];

      // Create a map of customizations by daypart + days + schedule_type
      const customizationMap = new Map<string, DaypartRoutine>();
      customizations.forEach(custom => {
        const key = `${custom.daypart_name}_${custom.schedule_type || 'regular'}_${custom.event_date || ''}_${custom.schedule_name || ''}`;
        customizationMap.set(key, custom);
      });

      // Add inherited schedules
      inheritedSchedules.forEach((schedule: DaypartSchedule) => {
        const definition = definitions.find((d: DaypartDefinition) => d.id === schedule.daypart_definition_id);
        if (!definition) return;

        const key = `${definition.daypart_name}_${schedule.schedule_type || 'regular'}_${schedule.event_date || ''}_${schedule.schedule_name || ''}`;

        // Only add if not customized
        if (!customizationMap.has(key)) {
          combined.push({
            ...schedule,
            is_inherited: true,
            daypart_name: definition.daypart_name,
            daypart_definition: definition,
            schedule_type: schedule.schedule_type || 'regular'
          });
        }
      });

      // Add customizations
      customizations.forEach(custom => {
        const definition = definitions.find((d: DaypartDefinition) => d.daypart_name === custom.daypart_name);
        if (!definition) return;

        combined.push({
          ...custom,
          daypart_definition_id: definition.id,
          is_inherited: false,
          daypart_name: custom.daypart_name,
          daypart_definition: definition,
          schedule_type: custom.schedule_type || 'regular'
        });
      });

      setEffectiveSchedules(combined);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (routine: Omit<DaypartRoutine, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRoutine) {
      const { error } = await supabase
        .from('placement_daypart_overrides')
        .update(routine)
        .eq('id', editingRoutine.id);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
    } else {
      const { error, data } = await supabase
        .from('placement_daypart_overrides')
        .insert([routine])
        .select();

      if (error) {
        console.error('Insert error details:', error);
        throw new Error(`Failed to create schedule: ${error.message}`);
      }

      console.log('Insert successful:', data);
    }

    setShowForm(false);
    setEditingRoutine(null);
    await loadData();
  };

  const handleEdit = (schedule: EffectiveSchedule) => {
    if (schedule.is_inherited) {
      // Clicking an inherited schedule creates a customization
      setEditingInherited(schedule);
      setEditingRoutine(null);
    } else {
      // Editing an existing customization
      setEditingRoutine(schedule as DaypartRoutine);
      setEditingInherited(null);
    }
    setShowForm(true);
  };

  const handleDelete = async (routineId: string) => {
    if (!confirm('Delete this customization? The schedule will revert to the inherited store-level configuration.')) {
      return;
    }

    const { error } = await supabase
      .from('placement_daypart_overrides')
      .delete()
      .eq('id', routineId);

    if (error) {
      console.error('Error deleting schedule:', error);
      throw new Error(error.message);
    }

    setShowForm(false);
    setEditingRoutine(null);
    setEditingInherited(null);
    await loadData();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoutine(null);
    setEditingInherited(null);
    setPreFillDaypart(undefined);
  };

  const handleAddNew = (scheduleType: 'regular' | 'event_holiday' = 'regular', daypartName?: string) => {
    setEditingRoutine(null);
    setPreFillDaypart(daypartName);
    setPreFillScheduleType(scheduleType);
    setShowForm(true);
  };

  const regularSchedules = effectiveSchedules.filter(s => s.schedule_type !== 'event_holiday');
  const eventSchedules = effectiveSchedules.filter(s => s.schedule_type === 'event_holiday');

  const groupedSchedules = regularSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.daypart_name]) {
      acc[schedule.daypart_name] = [];
    }
    acc[schedule.daypart_name].push(schedule);
    return acc;
  }, {} as Record<string, EffectiveSchedule[]>);

  const groupedEventSchedules = eventSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.daypart_name]) {
      acc[schedule.daypart_name] = [];
    }
    acc[schedule.daypart_name].push(schedule);
    return acc;
  }, {} as Record<string, EffectiveSchedule[]>);

  // Get all dayparts from definitions, not just ones with schedules
  const allDayparts = daypartDefinitions
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(d => d.daypart_name);

  const toggleEventsExpanded = (daypartName: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [daypartName]: !prev[daypartName]
    }));
  };

  const formatEventDate = (dateString: string | undefined, recurrenceType?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (recurrenceType === 'none') {
      options.year = 'numeric';
    }
    return date.toLocaleDateString('en-US', options);
  };

  const getRecurrenceLabel = (type?: string) => {
    switch (type) {
      case 'none': return 'One-time';
      case 'annual_date': return 'Annual';
      case 'monthly_date': return 'Monthly';
      case 'annual_relative': return 'Annual (relative)';
      case 'annual_date_range': return 'Annual range';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-3 border-slate-200 border-t-cyan-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-600" />
          Placement Schedules
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Configure daypart hours and event/holiday schedules for this placement.
        </p>
      </div>

      {/* Full-screen edit/create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-white z-50 md:absolute md:inset-auto md:bg-transparent md:z-0">
          {/* Mobile: minimal header with close button */}
          <div className="md:hidden sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
            <button
              onClick={handleCancel}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Form content */}
          <div className="h-full overflow-y-auto md:h-auto">
            <div className="p-4 md:p-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                {editingInherited ? (
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Creating customization from inherited schedule. This will override the store-level schedule for this placement.
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      This schedule will apply to the selected days for this placement.
                    </span>
                  </p>
                )}
              </div>
              <DaypartRoutineForm
                placementGroupId={placementGroupId}
                existingRoutines={routines}
                onSave={handleSave}
                onCancel={handleCancel}
                editingRoutine={editingInherited ? {
                  id: undefined,
                  placement_group_id: placementGroupId,
                  daypart_name: editingInherited.daypart_name,
                  days_of_week: editingInherited.days_of_week,
                  start_time: editingInherited.start_time,
                  end_time: editingInherited.end_time,
                  schedule_name: editingInherited.schedule_name,
                  runs_on_days: editingInherited.runs_on_days,
                  schedule_type: editingInherited.schedule_type,
                  event_name: editingInherited.event_name,
                  event_date: editingInherited.event_date,
                  recurrence_type: editingInherited.recurrence_type,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                } as DaypartRoutine : editingRoutine}
                preFillDaypart={preFillDaypart}
                preFillScheduleType={preFillScheduleType}
                onDelete={editingRoutine ? handleDelete : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {effectiveSchedules.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Daypart Schedules Configured</h3>
          <p className="text-slate-600 text-sm px-4">
            Configure daypart schedules at the store level first
          </p>
        </div>
      ) : effectiveSchedules.length > 0 ? (
        <div className="space-y-3">
          {allDayparts.map((daypartName) => {
            const daypartSchedules = groupedSchedules[daypartName] || [];
            const daypartEvents = groupedEventSchedules[daypartName] || [];
            const hasEvents = daypartEvents.length > 0;
            const eventsExpanded = expandedEvents[daypartName];
            const definition = daypartDefinitions.find(d => d.daypart_name === daypartName);
            if (!definition) return null;
            const displayLabel = definition.display_label;
            const colorClass = definition.color;

            return (
              <div key={daypartName} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className={`px-4 py-3 border-b border-slate-200 ${colorClass}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Clock className="w-4 h-4" />
                      <h4 className="font-semibold">{displayLabel}</h4>
                      {hasEvents && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-600/20 text-cyan-900 font-medium">
                          <Calendar className="w-3 h-3" />
                          {daypartEvents.length} {daypartEvents.length === 1 ? 'Event' : 'Events'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              <div className="divide-y divide-slate-200">
                {daypartSchedules.map((schedule) => (
                  <div key={schedule.id}>
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="w-full p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {schedule.schedule_name && (
                              <span className="text-sm font-semibold text-slate-900">
                                {schedule.schedule_name}
                              </span>
                            )}
                            <span className={`text-sm ${schedule.schedule_name ? 'text-slate-600' : 'font-medium text-slate-900'}`}>
                              {schedule.runs_on_days === false
                                ? 'Does Not Run'
                                : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                            </span>
                            {schedule.is_inherited && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                Inherited
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {schedule.days_of_week.sort().map(day => {
                              const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                              const bgColor = colorClass.match(/bg-(\w+)-\d+/)?.[0] || 'bg-slate-100';
                              const textColor = bgColor.replace('bg-', 'text-').replace('-100', '-700');
                              return (
                                <span
                                  key={day}
                                  className={`px-2 py-1 ${bgColor} ${textColor} text-xs rounded font-medium`}
                                >
                                  {dayInfo?.short}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  </div>
                ))}

                {daypartSchedules.length === 0 && !hasEvents && (
                  <div className="p-6 text-center">
                    <p className="text-slate-600 text-sm">
                      No schedules configured for this daypart. Configure at store level or add a customization.
                    </p>
                  </div>
                )}

                {hasEvents && (
                  <div className="border-t-2 border-cyan-200">
                    <button
                      type="button"
                      onClick={() => toggleEventsExpanded(daypartName)}
                      className="w-full px-4 py-3 bg-cyan-50 hover:bg-cyan-100 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-600" />
                        <span className="font-medium text-cyan-900">
                          Event & Holiday Schedules
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-600/20 text-cyan-900">
                          {daypartEvents.length}
                        </span>
                      </div>
                      {eventsExpanded ? (
                        <ChevronDown className="w-5 h-5 text-cyan-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-cyan-600" />
                      )}
                    </button>

                    {eventsExpanded && (
                      <div className="divide-y divide-cyan-100 bg-cyan-50/30">
                        {daypartEvents.map((schedule) => (
                          <div key={schedule.id}>
                            <button
                              onClick={() => handleEdit(schedule)}
                              className="w-full p-4 hover:bg-cyan-100/50 active:bg-cyan-100 transition-colors text-left"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    {schedule.schedule_name && (
                                      <span className="font-semibold text-cyan-900">
                                        {schedule.schedule_name}
                                      </span>
                                    )}
                                    <span className={`${schedule.schedule_name ? 'text-cyan-700' : 'font-medium text-cyan-900'}`}>
                                      {schedule.event_name || 'Unnamed Event'}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded font-medium">
                                      {getRecurrenceLabel(schedule.recurrence_type)}
                                    </span>
                                    {schedule.is_inherited && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                        Inherited
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-cyan-700 mb-2">
                                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                    {formatEventDate(schedule.event_date, schedule.recurrence_type)}
                                    <span className="mx-2 text-cyan-400">•</span>
                                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                                    {schedule.runs_on_days === false
                                      ? 'Does Not Run'
                                      : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                                  </div>
                                  {schedule.days_of_week.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {schedule.days_of_week.sort().map(day => {
                                        const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                                        const bgColor = colorClass.match(/bg-(\w+)-\d+/)?.[0] || 'bg-slate-100';
                                        const textColor = bgColor.replace('bg-', 'text-').replace('-100', '-700');
                                        return (
                                          <span
                                            key={day}
                                            className={`px-2 py-1 ${bgColor} ${textColor} text-xs rounded font-medium`}
                                          >
                                            {dayInfo?.short}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      ) : null}

      {!showForm && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleAddNew('regular')}
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Schedule
          </button>
          <button
            onClick={() => handleAddNew('event_holiday')}
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-violet-300 text-violet-600 rounded-lg hover:border-violet-600 hover:bg-violet-50 transition-colors font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Add Event/Holiday Hours
          </button>
        </div>
      )}
    </div>
  );
}
