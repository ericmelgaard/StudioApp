import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Clock, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlacementRoutine {
  id?: string;
  theme_id: string;
  placement_id: string;
  cycle_week: number;
  days_of_week: number[];
  start_time: string;
  status: 'active' | 'inactive' | 'paused';
  priority?: number;
  placement?: {
    id: string;
    name: string;
  };
}

interface PlacementGroup {
  id: string;
  name: string;
  description: string | null;
}

interface PlacementRoutineModalProps {
  themeId: string;
  themeName: string;
  onClose: () => void;
  onSave: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export default function PlacementRoutineModal({ themeId, themeName, onClose, onSave }: PlacementRoutineModalProps) {
  const [routines, setRoutines] = useState<PlacementRoutine[]>([]);
  const [placements, setPlacements] = useState<PlacementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [cycleSettings, setCycleSettings] = useState<{ cycle_duration_weeks: number } | null>(null);

  const [newRoutine, setNewRoutine] = useState({
    placement_id: '',
    cycle_week: 1,
    days_of_week: [] as number[],
    start_time: '06:00',
    status: 'active' as const
  });

  useEffect(() => {
    loadData();
  }, [themeId]);

  const loadData = async () => {
    setLoading(true);

    const [routinesResult, placementsResult, settingsResult] = await Promise.all([
      supabase
        .from('placement_routines')
        .select('*, placement_groups(id, name)')
        .eq('theme_id', themeId)
        .order('priority', { ascending: false }),
      supabase
        .from('placement_groups')
        .select('id, name, description')
        .order('name'),
      supabase
        .from('organization_cycle_settings')
        .select('cycle_duration_weeks')
        .limit(1)
        .maybeSingle()
    ]);

    if (routinesResult.error) {
      console.error('Error loading routines:', routinesResult.error);
    } else {
      const transformedRoutines = routinesResult.data?.map((r: any) => ({
        ...r,
        placement: r.placement_groups
      })) || [];
      setRoutines(transformedRoutines);
    }

    if (placementsResult.error) {
      console.error('Error loading placements:', placementsResult.error);
    } else {
      setPlacements(placementsResult.data || []);
    }

    if (settingsResult.error) {
      console.error('Error loading cycle settings:', settingsResult.error);
    } else {
      setCycleSettings(settingsResult.data);
    }

    setLoading(false);
  };

  const handleAddRoutine = async () => {
    if (!newRoutine.placement_id) {
      alert('Please select a placement');
      return;
    }

    if (newRoutine.days_of_week.length === 0) {
      alert('Please select at least one day');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('placement_routines')
        .insert({
          theme_id: themeId,
          placement_id: newRoutine.placement_id,
          cycle_week: newRoutine.cycle_week,
          days_of_week: newRoutine.days_of_week,
          start_time: newRoutine.start_time,
          status: newRoutine.status
        });

      if (error) throw error;

      setNewRoutine({
        placement_id: '',
        cycle_week: 1,
        days_of_week: [],
        start_time: '06:00',
        status: 'active'
      });
      setShowAddForm(false);
      await loadData();
    } catch (error: any) {
      console.error('Error adding routine:', error);
      alert(`Failed to add routine: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setNewRoutine(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  const handleDeleteRoutine = async (routineId: string) => {
    if (!confirm('Are you sure you want to delete this routine?')) {
      return;
    }

    const { error } = await supabase
      .from('placement_routines')
      .delete()
      .eq('id', routineId);

    if (error) {
      console.error('Error deleting routine:', error);
      alert(`Failed to delete routine: ${error.message}`);
    } else {
      await loadData();
    }
  };

  const handleToggleStatus = async (routine: PlacementRoutine) => {
    const newStatus = routine.status === 'active' ? 'paused' : 'active';

    const { error } = await supabase
      .from('placement_routines')
      .update({ status: newStatus })
      .eq('id', routine.id!);

    if (error) {
      console.error('Error updating routine status:', error);
      alert(`Failed to update routine: ${error.message}`);
    } else {
      await loadData();
    }
  };

  const maxCycleWeek = cycleSettings?.cycle_duration_weeks || 4;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Placement Routines</h2>
            <p className="text-sm text-slate-600 mt-1">Schedule when "{themeName}" runs on placements</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          {!cycleSettings && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Organization cycle settings haven't been configured yet.
                Please configure them in Site Configuration to see accurate cycle week options.
              </p>
            </div>
          )}

          {routines.length === 0 && !showAddForm ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No routines configured</h3>
              <p className="text-slate-600 mb-6">
                Add placement routines to schedule when this theme should be active
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                Add Routine
              </button>
            </div>
          ) : (
            <>
              {!showAddForm && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Routine
                  </button>
                </div>
              )}

              {showAddForm && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4">New Routine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Placement
                      </label>
                      <select
                        value={newRoutine.placement_id}
                        onChange={(e) => setNewRoutine({ ...newRoutine, placement_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a placement...</option>
                        {placements.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.description && ` - ${p.description}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Cycle Week
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={maxCycleWeek}
                        value={newRoutine.cycle_week}
                        onChange={(e) => setNewRoutine({ ...newRoutine, cycle_week: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">Week 1-{maxCycleWeek} of cycle</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        Days of Week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              newRoutine.days_of_week.includes(day.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {day.label.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={newRoutine.start_time}
                        onChange={(e) => setNewRoutine({ ...newRoutine, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status
                      </label>
                      <select
                        value={newRoutine.status}
                        onChange={(e) => setNewRoutine({ ...newRoutine, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAddRoutine}
                      disabled={saving || !newRoutine.placement_id || newRoutine.days_of_week.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Adding...' : 'Add Routine'}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {routines.length > 0 && (
                <div className="space-y-3">
                  {routines.map((routine) => (
                    <div
                      key={routine.id}
                      className={`p-4 rounded-lg border ${
                        routine.status === 'active'
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50 border-slate-300 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <MapPin className="w-5 h-5 text-slate-400" />
                            <h4 className="font-semibold text-slate-900">
                              {routine.placement?.name || 'Unknown Placement'}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              routine.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {routine.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex gap-6">
                              <div>
                                <span className="text-slate-500">Week:</span>
                                <span className="ml-2 font-medium text-slate-900">
                                  Week {routine.cycle_week}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Time:</span>
                                <span className="ml-2 font-medium text-slate-900">
                                  {routine.start_time}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500">Days:</span>
                              <div className="inline-flex flex-wrap gap-1 ml-2">
                                {routine.days_of_week?.map(day => (
                                  <span
                                    key={day}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                                  >
                                    {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleStatus(routine)}
                            className={`p-2 rounded-lg transition-colors ${
                              routine.status === 'active'
                                ? 'hover:bg-amber-50 text-amber-600'
                                : 'hover:bg-green-50 text-green-600'
                            }`}
                            title={routine.status === 'active' ? 'Pause routine' : 'Activate routine'}
                          >
                            {routine.status === 'active' ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteRoutine(routine.id!)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete routine"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
