import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ScheduleGroupForm from './ScheduleGroupForm';
import { Schedule } from '../hooks/useScheduleCollisionDetection';

interface OperationSchedule extends Schedule {
  id?: string;
  store_id: number;
  schedule_name?: string;
  is_closed: boolean;
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
  const [editingSchedule, setEditingSchedule] = useState<OperationSchedule | null>(null);
  const [newSchedule, setNewSchedule] = useState<OperationSchedule>({
    store_id: storeId,
    schedule_name: '',
    days_of_week: [],
    start_time: '09:00',
    end_time: '17:00',
    is_closed: false,
    daypart_name: 'operation_hours'
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
        daypart_name: 'operation_hours'
      }));

      setSchedules(mappedSchedules);
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
      daypart_name: 'operation_hours'
    });
    setAddingSchedule(true);
    setEditingSchedule(null);
  };

  const handleEditSchedule = (schedule: OperationSchedule) => {
    setEditingSchedule(schedule);
    setAddingSchedule(false);
  };

  const handleSaveSchedule = async (schedule: Schedule) => {
    try {
      const scheduleData = {
        store_id: storeId,
        schedule_name: (schedule as OperationSchedule).schedule_name || null,
        days_of_week: schedule.days_of_week,
        open_time: schedule.start_time,
        close_time: schedule.end_time,
        is_closed: (schedule as OperationSchedule).is_closed || false,
        updated_at: new Date().toISOString()
      };

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Store Operation Hours</h3>
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

      <div className="space-y-4 mb-6">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden"
          >
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">
                    {schedule.schedule_name || 'Store Hours'}
                  </h4>
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
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => schedule.id && handleDeleteSchedule(schedule.id)}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    title="Delete schedule"
                  >
                    <Trash2 className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>
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
                    onSave={() => handleSaveSchedule(editingSchedule)}
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
                        {schedule.is_closed ? 'Closed' : `${schedule.start_time} - ${schedule.end_time}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {schedule.days_of_week.sort().map(day => {
                        const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                        return (
                          <span
                            key={day}
                            className="px-2 py-1 text-xs rounded font-medium bg-blue-100 text-blue-800 border border-blue-300"
                          >
                            {dayInfo?.short}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {schedules.length === 0 && !addingSchedule && (
          <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-600 mb-4">
              No operation hours set. Add a schedule to define when your store is open.
            </p>
          </div>
        )}

        {addingSchedule && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-slate-900">New Schedule</h4>
              </div>
            </div>
            <div className="px-4 pb-4 bg-slate-50">
              <div className="pt-4 space-y-4">
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
                <ScheduleGroupForm
                  schedule={newSchedule}
                  allSchedules={schedules}
                  onUpdate={setNewSchedule}
                  onSave={() => handleSaveSchedule(newSchedule)}
                  onCancel={() => setAddingSchedule(false)}
                  level="site"
                />
              </div>
            </div>
          </div>
        )}

        {!addingSchedule && !editingSchedule && (
          <button
            type="button"
            onClick={handleAddSchedule}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Schedule
          </button>
        )}
      </div>
    </div>
  );
}
