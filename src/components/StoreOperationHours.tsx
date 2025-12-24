import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, AlertCircle, Check, Sparkles } from 'lucide-react';
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
  const [newSchedule, setNewSchedule] = useState<OperationSchedule>({
    store_id: storeId,
    schedule_name: '',
    days_of_week: [],
    start_time: '09:00',
    end_time: '17:00',
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
      console.error('Error loading operation hours:', err);
      setError(err.message || 'Failed to load operation hours');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = () => {
    setNewSchedule({
      store_id: storeId,
      schedule_name: '',
      days_of_week: [],
      start_time: '09:00',
      end_time: '17:00',
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
      start_time: '09:00',
      end_time: '17:00',
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

  const filteredSchedules = schedules.filter(schedule => {
    if (filterType === 'all') return true;
    if (filterType === 'regular') return schedule.schedule_type !== 'event_holiday';
    if (filterType === 'event') return schedule.schedule_type === 'event_holiday';
    return true;
  });

  const eventCount = schedules.filter(s => s.schedule_type === 'event_holiday').length;
  const regularCount = schedules.filter(s => s.schedule_type !== 'event_holiday').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Store Operation Hours</h3>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({schedules.length})
        </button>
        <button
          onClick={() => setFilterType('regular')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'regular'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Regular Hours ({regularCount})
        </button>
        <button
          onClick={() => setFilterType('event')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'event'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Events & Holidays ({eventCount})
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
        {filteredSchedules.map((schedule) => {
          const isEvent = schedule.schedule_type === 'event_holiday';
          const headerBg = isEvent ? 'bg-amber-50' : 'bg-blue-50';
          const headerBorder = isEvent ? 'border-amber-100' : 'border-blue-100';
          const iconColor = isEvent ? 'text-amber-600' : 'text-blue-600';
          const Icon = isEvent ? Sparkles : Calendar;

          return (
            <div
              key={schedule.id}
              className={`bg-white rounded-lg border ${isEvent ? 'border-amber-200' : 'border-slate-200'} overflow-hidden`}
            >
              <div className={`px-4 py-3 ${headerBg} border-b ${headerBorder}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    <h4 className="font-semibold text-slate-900">
                      {isEvent ? schedule.event_name : (schedule.schedule_name || 'Store Hours')}
                    </h4>
                    {isEvent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-900 font-medium">
                        Event
                      </span>
                    )}
                    {schedule.is_closed && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600/20 text-slate-900">
                        Closed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditSchedule(schedule)}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                      title="Edit schedule"
                    >
                      <Edit2 className={`w-4 h-4 ${iconColor}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => schedule.id && handleDeleteSchedule(schedule.id)}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                      title="Delete schedule"
                    >
                      <Trash2 className={`w-4 h-4 ${iconColor}`} />
                    </button>
                  </div>
                </div>
                {isEvent && schedule.recurrence_type && (
                  <div className="mt-2 text-sm text-amber-800">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {formatRecurrenceText(schedule.recurrence_type, schedule.recurrence_config, schedule.event_date)}
                  </div>
                )}
              </div>

            {editingSchedule?.id === schedule.id ? (
              <div className="px-4 pb-4 bg-slate-50 border-t border-slate-200">
                <div className="pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Schedule Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingSchedule.schedule_name || ''}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, schedule_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Weekday Hours, Weekend Hours"
                    />
                  </div>
                  <ScheduleGroupForm
                    schedule={editingSchedule}
                    allSchedules={schedules}
                    onUpdate={setEditingSchedule}
                    onSave={handleSaveSchedule}
                    onCancel={() => setEditingSchedule(null)}
                    level="site"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-slate-900">
                        {schedule.runs_on_days === false
                          ? 'Does Not Run'
                          : schedule.is_closed
                            ? 'Closed'
                            : `${schedule.start_time} - ${schedule.end_time}`}
                      </span>
                      {isEvent && schedule.priority_level && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          Priority: {schedule.priority_level === 100 ? 'Single Day' : 'Date Range'}
                        </span>
                      )}
                    </div>
                    {!isEvent && schedule.days_of_week.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {schedule.days_of_week.sort().map(day => {
                          const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                          return (
                            <span
                              key={day}
                              className={`px-2 py-1 text-xs rounded font-medium ${
                                isEvent
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {dayInfo?.short}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })}

        {schedules.length === 0 && !addingSchedule && !addingEventSchedule && (
          <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-600 mb-4">
              No operation hours set. Add a schedule to define when your store is open.
            </p>
          </div>
        )}

        {(addingSchedule || addingEventSchedule) && (
          <div className={`bg-white rounded-lg border ${addingEventSchedule ? 'border-amber-200' : 'border-slate-200'} overflow-hidden`}>
            <div className={`px-4 py-3 ${addingEventSchedule ? 'bg-amber-50 border-b border-amber-100' : 'bg-blue-50 border-b border-blue-100'}`}>
              <div className="flex items-center gap-2">
                {addingEventSchedule ? (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h4 className="font-semibold text-slate-900">New Event / Holiday Schedule</h4>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">New Regular Schedule</h4>
                  </>
                )}
              </div>
            </div>
            <div className="px-4 pb-4 bg-slate-50">
              <div className="pt-4 space-y-4">
                {!addingEventSchedule && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Schedule Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={newSchedule.schedule_name || ''}
                      onChange={(e) => setNewSchedule({ ...newSchedule, schedule_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Weekday Hours, Weekend Hours"
                    />
                  </div>
                )}
                <ScheduleGroupForm
                  schedule={newSchedule}
                  allSchedules={schedules}
                  onUpdate={setNewSchedule}
                  onSave={handleSaveSchedule}
                  onCancel={() => {
                    setAddingSchedule(false);
                    setAddingEventSchedule(false);
                  }}
                  level="site"
                />
              </div>
            </div>
          </div>
        )}

        {!addingSchedule && !addingEventSchedule && !editingSchedule && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleAddSchedule}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Schedule
            </button>
            <button
              type="button"
              onClick={handleAddEventSchedule}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-300 text-amber-600 rounded-lg hover:border-amber-600 hover:bg-amber-50 transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Add Event/Holiday
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
