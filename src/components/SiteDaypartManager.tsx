import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DaypartRoutineForm, { DaypartRoutine } from './DaypartRoutineForm';
import DaypartTimelineView from './DaypartTimelineView';

interface SiteDaypartManagerProps {
  placementGroupId: string;
}

interface DaypartDefinition {
  daypart_name: string;
  display_label: string;
  color: string;
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

export default function SiteDaypartManager({ placementGroupId }: SiteDaypartManagerProps) {
  const [routines, setRoutines] = useState<DaypartRoutine[]>([]);
  const [daypartDefinitions, setDaypartDefinitions] = useState<Record<string, DaypartDefinition>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<DaypartRoutine | null>(null);

  useEffect(() => {
    loadDaypartDefinitions();
    loadRoutines();
  }, [placementGroupId]);

  const loadDaypartDefinitions = async () => {
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('daypart_name, display_label, color')
      .eq('is_active', true);

    if (!error && data) {
      const definitionsMap = data.reduce((acc, def) => {
        acc[def.daypart_name] = def;
        return acc;
      }, {} as Record<string, DaypartDefinition>);
      setDaypartDefinitions(definitionsMap);
    }
  };

  const loadRoutines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('placement_daypart_overrides')
      .select('*')
      .eq('placement_group_id', placementGroupId)
      .order('daypart_name')
      .order('created_at');

    if (error) {
      console.error('Error loading daypart routines:', error);
    } else {
      setRoutines(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (routine: Omit<DaypartRoutine, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRoutine) {
      const { error } = await supabase
        .from('placement_daypart_overrides')
        .update(routine)
        .eq('id', editingRoutine.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('placement_daypart_overrides')
        .insert([routine]);

      if (error) throw error;
    }

    setShowForm(false);
    setEditingRoutine(null);
    await loadRoutines();
  };

  const handleEdit = (routine: DaypartRoutine) => {
    setEditingRoutine(routine);
    setShowForm(true);
  };

  const handleDelete = async (routineId: string) => {
    if (!confirm('Are you sure you want to delete this daypart routine?')) {
      return;
    }

    const { error } = await supabase
      .from('placement_daypart_overrides')
      .delete()
      .eq('id', routineId);

    if (error) {
      console.error('Error deleting routine:', error);
      alert(`Failed to delete routine: ${error.message}`);
    } else {
      await loadRoutines();
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoutine(null);
  };

  const handleAddNew = () => {
    setEditingRoutine(null);
    setShowForm(true);
  };

  const groupedRoutines = routines.reduce((acc, routine) => {
    if (!acc[routine.daypart_name]) {
      acc[routine.daypart_name] = [];
    }
    acc[routine.daypart_name].push(routine);
    return acc;
  }, {} as Record<string, DaypartRoutine[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-3 border-slate-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Site Daypart Routines
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Configure when each daypart is active. Each daypart can have multiple routines for different days.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Routine
          </button>
        )}
      </div>

      {routines.length > 0 && (
        <DaypartTimelineView routines={routines} />
      )}

      {showForm && !editingRoutine && (
        <DaypartRoutineForm
          placementGroupId={placementGroupId}
          existingRoutines={routines}
          onSave={handleSave}
          onCancel={handleCancel}
          editingRoutine={null}
        />
      )}

      {routines.length === 0 && !showForm ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Daypart Routines</h3>
          <p className="text-slate-600 mb-4 text-sm">
            Add daypart routines to define operating hours for different meal periods
          </p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add First Routine
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedRoutines).map(([daypartName, daypartRoutines]) => {
            const definition = daypartDefinitions[daypartName];
            const displayLabel = definition?.display_label || daypartName;
            const colorClass = definition?.color || 'bg-slate-100 text-slate-800 border-slate-300';

            return (
              <div key={daypartName} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className={`px-4 py-3 border-b border-slate-200 ${colorClass}`}>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {displayLabel}
                  </h4>
                </div>
              <div className="divide-y divide-slate-200">
                {daypartRoutines.map((routine) => (
                  <div key={routine.id}>
                    <div className="p-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-slate-900">
                              {routine.runs_on_days === false
                                ? 'Does Not Run'
                                : `${formatTime(routine.start_time)} - ${formatTime(routine.end_time)}`}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {routine.days_of_week.sort().map(day => {
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
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(routine)}
                            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit routine"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(routine.id!)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete routine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {editingRoutine?.id === routine.id && (
                      <div className="px-4 pb-4 bg-amber-50 border-t border-amber-200">
                        <div className="pt-4">
                          <DaypartRoutineForm
                            placementGroupId={placementGroupId}
                            existingRoutines={routines}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            editingRoutine={editingRoutine}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
