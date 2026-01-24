import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, AlertCircle, Check, Sparkles, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ScheduleGroupForm from './ScheduleGroupForm';
import { Schedule } from '../hooks/useScheduleCollisionDetection';
import { ScheduleType, RecurrenceType, RecurrenceConfig, formatRecurrenceText, isEventSchedule } from '../types/schedules';

interface OperationSchedule extends Schedule {
  id?: string;
  store_id: number;
  schedule_name?: string;
  is_closed: boolean;
  schedule_type?: ScheduleType;
  event_name?: string;
  event_date?: string;
  recurrence_type?: RecurrenceType;
  recurrence_config?: RecurrenceConfig;
  priority_level?: number;
  runs_on_days?: boolean;
}

interface StoreOperationHoursProps {
  storeId: number;
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

export default function StoreOperationHours({ storeId }: StoreOperationHoursProps) {
  const [schedules, setSchedules] = useState<OperationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [addingEventSchedule, setAddingEventSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<OperationSchedule | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'event'>('all');
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [newSchedule, setNewSchedule] = useState<OperationSchedule>({
    store_id: storeId,
    schedule_name: '',
    days_of_week: [],
    start_time: '23:00',
    end_time: '06:00',
    is_closed: false,
    daypart_name: 'operation_hours',
    schedule_type: 'regular',
    runs_on_days: true
  });

  useEffect(() => {
    loadSchedules();
  }, [storeId]);

  const loadSchedules = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('store_operation_hours_schedules')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at');

      if (fetchError) throw fetchError;

      const mappedSchedules: OperationSchedule[] = (data || []).map(s => ({
        id: s.id,
        store_id: s.store_id,
        schedule_name: s.schedule_name,
        days_of_week: s.days_of_week || [],
        start_time: s.open_time || '09:00',
        end_time: s.close_time || '17:00',
        is_closed: s.is_closed || false,
        daypart_name: 'operation_hours',
        schedule_type: s.schedule_type || 'regular',
        event_name: s.event_name,
        event_date: s.event_date,
        recurrence_type: s.recurrence_type,
        recurrence_config: s.recurrence_config,
        priority_level: s.priority_level || 10,
        runs_on_days: s.runs_on_days !== false
      }));

      const sortedSchedules = mappedSchedules.sort((a, b) => {
        if (a.schedule_type === 'event_holiday' && b.schedule_type !== 'event_holiday') return -1;
        if (a.schedule_type !== 'event_holiday' && b.schedule_type === 'event_holiday') return 1;
        return (b.priority_level || 10) - (a.priority_level || 10);
      });

      setSchedules(sortedSchedules);
    } catch (err: any) {
      console.error('Error loading power save schedules:', err);
      setError(err.message || 'Failed to load power save schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = () => {
    setNewSchedule({
      store_id: storeId,
      schedule_name: '',
      days_of_week: [],
      start_time: '23:00',
      end_time: '06:00',
      is_closed: false,
      daypart_name: 'operation_hours',
      schedule_type: 'regular',
      runs_on_days: true
    });
    setAddingSchedule(true);
    setAddingEventSchedule(false);
    setEditingSchedule(null);
  };

  const handleAddEventSchedule = () => {
    setNewSchedule({
      store_id: storeId,
      schedule_name: '',
      days_of_week: [],
      start_time: '23:00',
      end_time: '06:00',
      is_closed: false,
      daypart_name: 'operation_hours',
      schedule_type: 'event_holiday',
      runs_on_days: true
    });
    setAddingEventSchedule(true);
    setAddingSchedule(false);
    setEditingSchedule(null);
  };

  const handleEditSchedule = (schedule: OperationSchedule) => {
    setEditingSchedule(schedule);
    setAddingSchedule(false);
  };

  const handleSaveSchedule = async (schedule: Schedule) => {
    try {
      const operationSchedule = schedule as OperationSchedule;
      const scheduleData: any = {
        store_id: storeId,
        schedule_name: operationSchedule.schedule_name || null,
        days_of_week: schedule.days_of_week,
        open_time: schedule.runs_on_days !== false ? schedule.start_time : null,
        close_time: schedule.runs_on_days !== false ? schedule.end_time : null,
        is_closed: operationSchedule.is_closed || false,
        schedule_type: schedule.schedule_type || 'regular',
        priority_level: schedule.priority_level || 10,
        runs_on_days: schedule.runs_on_days !== false,
        updated_at: new Date().toISOString()
      };

      if (schedule.schedule_type === 'event_holiday') {
        scheduleData.event_name = schedule.event_name;
        scheduleData.event_date = schedule.event_date || null;
        scheduleData.recurrence_type = schedule.recurrence_type;
        scheduleData.recurrence_config = schedule.recurrence_config || null;
      }

      if (editingSchedule?.id) {
        const { error: updateError } = await supabase
          .from('store_operation_hours_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (updateError) throw updateError;
        setSuccess('Schedule updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('store_operation_hours_schedules')
          .insert([scheduleData]);

        if (insertError) throw insertError;
        setSuccess('Schedule created successfully');
      }

      setAddingSchedule(false);
      setAddingEventSchedule(false);
      setEditingSchedule(null);
      await loadSchedules();

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
      const { error: deleteError } = await supabase
        .from('store_operation_hours_schedules')
        .delete()
        .eq('id', scheduleId);

      if (deleteError) throw deleteError;

      setSuccess('Schedule deleted successfully');
      await loadSchedules();

      setTimeout(() => setSuccess(null), 3000);
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

  const regularSchedules = schedules.filter(s => s.schedule_type !== 'event_holiday');
  const eventSchedules = schedules.filter(s => s.schedule_type === 'event_holiday');

  const eventCount = eventSchedules.length;
  const regularCount = regularSchedules.length;

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

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Power Save</h3>
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

      <div className="space-y-5 mb-6">
        {regularSchedules.length === 0 && eventSchedules.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-opacity">
            <div className="px-4 py-3 border-b border-slate-200 bg-orange-100 text-orange-800 border-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-4 h-4" />
                  <h4 className="font-semibold">Power Save</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600/20 text-slate-900">
                    Global
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <Plus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">
                  No power save schedules configured yet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddEventSchedule}
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
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md">
            <div className="px-4 py-3 border-b border-slate-200 bg-orange-100 text-orange-800 border-orange-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <h4 className="font-semibold">Power Save</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600/20 text-slate-900">
                  Global
                </span>
                {eventSchedules.length > 0 && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(222, 56, 222, 0.15)', color: 'rgb(156, 39, 176)' }}>
                    <Calendar className="w-3 h-3" />
                    {eventSchedules.length} {eventSchedules.length === 1 ? 'Event' : 'Events'}
                  </span>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {regularSchedules.map((schedule) => (
                <div key={schedule.id}>
                  <button
                    onClick={() => handleEditSchedule(schedule)}
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
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {schedule.days_of_week.sort().map(day => {
                            const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                            return (
                              <span
                                key={day}
                                className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium"
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

              {regularSchedules.length > 0 && (
                <div className="mx-3 mb-3 mt-3">
                  <button
                    type="button"
                    onClick={handleAddEventSchedule}
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
              )}

              {eventSchedules.length > 0 && (
                <div className="mx-3 mb-3 mt-2 rounded-lg overflow-hidden" style={{ border: '2px solid rgba(222, 56, 222, 0.2)', backgroundColor: 'rgba(222, 56, 222, 0.03)' }}>
                  <button
                    type="button"
                    onClick={() => setEventsExpanded(!eventsExpanded)}
                    className="w-full px-4 py-3 transition-colors flex items-center justify-between group"
                    style={{ backgroundColor: 'rgba(222, 56, 222, 0.08)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.08)'}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" style={{ color: 'rgb(156, 39, 176)' }} />
                      <span className="font-medium" style={{ color: 'rgb(156, 39, 176)' }}>
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
                            onClick={() => handleEditSchedule(schedule)}
                            className="w-full p-4 transition-colors text-left"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(222, 56, 222, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  {schedule.schedule_name && (
                                    <span className="font-semibold" style={{ color: 'rgb(156, 39, 176)' }}>
                                      {schedule.schedule_name}
                                    </span>
                                  )}
                                  <span className={schedule.schedule_name ? '' : 'font-medium'} style={{ color: 'rgb(156, 39, 176)' }}>
                                    {schedule.event_name || 'Unnamed Event'}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: 'rgba(222, 56, 222, 0.15)', color: 'rgb(156, 39, 176)' }}>
                                    {getRecurrenceLabel(schedule.recurrence_type)}
                                  </span>
                                </div>
                                <div className="text-sm mb-2" style={{ color: 'rgb(156, 39, 176)' }}>
                                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                  {formatEventDate(schedule.event_date, schedule.recurrence_type)}
                                  <span className="mx-2" style={{ color: 'rgba(222, 56, 222, 0.4)' }}>•</span>
                                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                                  {schedule.runs_on_days === false
                                    ? 'Does Not Run'
                                    : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                                </div>
                                {schedule.days_of_week.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {schedule.days_of_week.sort().map(day => {
                                      const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                                      return (
                                        <span
                                          key={day}
                                          className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium"
                                        >
                                          {dayInfo?.short}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: 'rgba(156, 39, 176, 0.4)' }} />
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
        )}

        {(addingSchedule || editingSchedule) && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-orange-100 text-orange-800 border-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    Power Save
                  </h3>
                  <span className="text-sm text-slate-700">
                    {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <ScheduleGroupForm
                schedule={editingSchedule || newSchedule}
                allSchedules={schedules}
                onUpdate={(updated) => {
                  if (editingSchedule) {
                    setEditingSchedule(updated as OperationSchedule);
                  } else {
                    setNewSchedule(updated as OperationSchedule);
                  }
                }}
                onSave={handleSaveSchedule}
                onCancel={() => {
                  setEditingSchedule(null);
                  setNewSchedule({
                    store_id: storeId,
                    schedule_name: '',
                    days_of_week: [],
                    start_time: '23:00',
                    end_time: '06:00',
                    is_closed: false,
                    daypart_name: 'operation_hours',
                    schedule_type: 'regular',
                    runs_on_days: true
                  });
                  setAddingSchedule(false);
                  setAddingEventSchedule(false);
                }}
                onDelete={editingSchedule?.id ? handleDeleteSchedule : undefined}
                level="site"
                skipDayValidation={true}
                disableCollisionDetection={true}
              />
            </div>
          </div>
        )}

        {addingEventSchedule && !editingSchedule && !addingSchedule && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-orange-100 text-orange-800 border-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    Power Save
                  </h3>
                  <span className="text-sm text-amber-900 font-medium">Event</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <ScheduleGroupForm
                schedule={newSchedule}
                allSchedules={schedules}
                onUpdate={setNewSchedule}
                onSave={handleSaveSchedule}
                onCancel={() => {
                  setAddingEventSchedule(false);
                  setNewSchedule({
                    store_id: storeId,
                    schedule_name: '',
                    days_of_week: [],
                    start_time: '23:00',
                    end_time: '06:00',
                    is_closed: false,
                    daypart_name: 'operation_hours',
                    schedule_type: 'regular',
                    runs_on_days: true
                  });
                }}
                level="site"
                skipDayValidation={true}
                disableCollisionDetection={true}
              />
            </div>
          </div>
        )}

        {!addingSchedule && !addingEventSchedule && !editingSchedule && regularSchedules.length === 0 && eventSchedules.length === 0 && (
          <div className="mx-3 mb-3 mt-3">
            <button
              type="button"
              onClick={handleAddSchedule}
              className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-medium text-slate-700">
                Add Schedule
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
