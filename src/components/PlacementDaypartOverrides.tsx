import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Clock, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DaypartRoutineForm, { DaypartRoutine } from './DaypartRoutineForm';

interface PlacementDaypartOverridesProps {
  placementGroupId: string;
}

interface SiteRoutine extends DaypartRoutine {
  is_inherited: boolean;
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

const DAYPART_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  late_night: 'Late Night',
  dark_hours: 'Dark Hours'
};

const DAYPART_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-800 border-amber-300',
  lunch: 'bg-green-100 text-green-800 border-green-300',
  dinner: 'bg-blue-100 text-blue-800 border-blue-300',
  late_night: 'bg-purple-100 text-purple-800 border-purple-300',
  dark_hours: 'bg-slate-100 text-slate-800 border-slate-300'
};

export default function PlacementDaypartOverrides({ placementGroupId }: PlacementDaypartOverridesProps) {
  const [routines, setRoutines] = useState<DaypartRoutine[]>([]);
  const [siteRoutines, setSiteRoutines] = useState<SiteRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<DaypartRoutine | null>(null);
  const [preFillDaypart, setPreFillDaypart] = useState<string | undefined>(undefined);
  const [storeRootId, setStoreRootId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [placementGroupId]);

  const loadData = async () => {
    setLoading(true);

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

    const rootResult = await supabase
      .from('placement_groups')
      .select('id')
      .eq('store_id', placementResult.data.store_id)
      .eq('is_store_root', true)
      .maybeSingle();

    if (rootResult.error || !rootResult.data) {
      console.error('Error loading store root:', rootResult.error);
      setLoading(false);
      return;
    }

    setStoreRootId(rootResult.data.id);

    const [routinesResult, siteRoutinesResult] = await Promise.all([
      supabase
        .from('placement_daypart_overrides')
        .select('*')
        .eq('placement_group_id', placementGroupId)
        .order('daypart_name')
        .order('created_at'),
      supabase
        .from('site_daypart_routines')
        .select('*')
        .eq('placement_group_id', rootResult.data.id)
        .order('daypart_name')
        .order('created_at')
    ]);

    if (routinesResult.error) {
      console.error('Error loading routines:', routinesResult.error);
    } else {
      setRoutines(routinesResult.data || []);
    }

    if (siteRoutinesResult.error) {
      console.error('Error loading site routines:', siteRoutinesResult.error);
    } else {
      setSiteRoutines((siteRoutinesResult.data || []).map(r => ({ ...r, is_inherited: true })));
    }

    setLoading(false);
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
        throw new Error(`Failed to create routine: ${error.message}`);
      }

      console.log('Insert successful:', data);
    }

    setShowForm(false);
    setEditingRoutine(null);
    await loadData();
  };

  const handleEdit = (routine: DaypartRoutine) => {
    setEditingRoutine(routine);
    setShowForm(true);
  };

  const handleDelete = async (routineId: string) => {
    if (!confirm('Are you sure you want to delete this routine?')) {
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
      await loadData();
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoutine(null);
    setPreFillDaypart(undefined);
  };

  const handleAddNew = (daypartName?: string) => {
    setEditingRoutine(null);
    setPreFillDaypart(daypartName);
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
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-3 border-slate-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          Placement Daypart Routines
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Configure specific daypart hours for this placement. If not set, inherits from site configuration.
        </p>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              This routine will apply to the selected days for this placement.
            </span>
          </p>
        </div>
      )}

      {showForm && (
        <DaypartRoutineForm
          placementGroupId={placementGroupId}
          existingRoutines={routines}
          onSave={handleSave}
          onCancel={handleCancel}
          editingRoutine={editingRoutine}
          preFillDaypart={preFillDaypart}
        />
      )}

      {routines.length === 0 && !showForm ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Placement Routines</h3>
          <p className="text-slate-600 mb-2 text-sm">
            This placement inherits all daypart hours from the site configuration
          </p>
          <button
            onClick={handleAddNew}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Placement Routine
          </button>
        </div>
      ) : routines.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedRoutines).map(([daypartName, daypartRoutines]) => (
            <div key={daypartName} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className={`px-4 py-3 border-b border-slate-200 ${DAYPART_COLORS[daypartName]}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {DAYPART_LABELS[daypartName] || daypartName}
                  </h4>
                  {!showForm && (
                    <button
                      onClick={() => handleAddNew(daypartName)}
                      className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-white/50 rounded-lg transition-colors"
                      title={`Add another ${DAYPART_LABELS[daypartName]} routine`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {daypartRoutines.map((routine) => (
                  <div key={routine.id} className="p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-slate-900">
                            {routine.start_time} - {routine.end_time}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {routine.days_of_week.sort().map(day => {
                            const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                            return (
                              <span
                                key={day}
                                className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded font-medium"
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
                ))}
              </div>
            </div>
          ))}
          {!showForm && (
            <button
              onClick={() => handleAddNew()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-amber-600 hover:text-amber-600 hover:bg-amber-50 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Daypart Routine
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
