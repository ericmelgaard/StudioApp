import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TimeSelector from './TimeSelector';

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
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [cycleSettings, setCycleSettings] = useState<{ cycle_duration_weeks: number } | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    console.log('State changed - showAddForm:', showAddForm, 'editingRoutineId:', editingRoutineId);
    if (showAddForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showAddForm, editingRoutineId]);

  const loadData = async () => {
    console.log('loadData called');
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

  const handleStartEdit = (routine: PlacementRoutine, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('Starting edit for routine:', routine.id);

    setShowAddForm(true);
    setEditingRoutineId(routine.id!);
    setNewRoutine({
      placement_id: routine.placement_id,
      cycle_week: routine.cycle_week,
      days_of_week: [...routine.days_of_week],
      start_time: routine.start_time,
      status: routine.status
    });

    console.log('Edit state set - showAddForm: true, editingRoutineId:', routine.id);
  };

  const handleCancelEdit = () => {
    setEditingRoutineId(null);
    setShowAddForm(false);
    setNewRoutine({
      placement_id: '',
      cycle_week: 1,
      days_of_week: [],
      start_time: '06:00',
      status: 'active'
    });
  };

  const handleSaveRoutine = async () => {
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
      if (editingRoutineId) {
        const { error } = await supabase
          .from('placement_routines')
          .update({
            placement_id: newRoutine.placement_id,
            cycle_week: newRoutine.cycle_week,
            days_of_week: newRoutine.days_of_week,
            start_time: newRoutine.start_time,
            status: newRoutine.status
          })
          .eq('id', editingRoutineId);

        if (error) throw error;
      } else {
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
      }

      setNewRoutine({
        placement_id: '',
        cycle_week: 1,
        days_of_week: [],
        start_time: '06:00',
        status: 'active'
      });
      setEditingRoutineId(null);
      setShowAddForm(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving routine:', error);
      alert(`Failed to save routine: ${error.message}`);
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

  const selectAllDays = () => {
    setNewRoutine(prev => ({
      ...prev,
      days_of_week: [0, 1, 2, 3, 4, 5, 6]
    }));
  };

  const clearAllDays = () => {
    setNewRoutine(prev => ({
      ...prev,
      days_of_week: []
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
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
              {!showAddForm && !editingRoutineId && (
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
                <div ref={formRef} className="mb-6 bg-white rounded-lg border border-slate-200">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">
                      {editingRoutineId ? 'Edit Routine' : 'New Routine'}
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-200">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">
                          Placement
                        </label>
                        <span className="text-xs text-slate-500">Required</span>
                      </div>
                      <select
                        value={newRoutine.placement_id}
                        onChange={(e) => setNewRoutine({ ...newRoutine, placement_id: e.target.value })}
                        className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
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

                    <div className="p-4">
                      <div className="text-sm font-medium text-slate-700 mb-2">Schedule Time</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Cycle Week</label>
                          <input
                            type="number"
                            min="1"
                            max={maxCycleWeek}
                            value={newRoutine.cycle_week}
                            onChange={(e) => setNewRoutine({ ...newRoutine, cycle_week: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-slate-500 mt-1">Week 1-{maxCycleWeek}</p>
                        </div>
                        <div>
                          <TimeSelector
                            label="Start Time"
                            value={newRoutine.start_time}
                            onChange={(time) => setNewRoutine({ ...newRoutine, start_time: time })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-slate-700">Days Of The Week</label>
                        <button
                          type="button"
                          onClick={newRoutine.days_of_week.length === 7 ? clearAllDays : selectAllDays}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {newRoutine.days_of_week.length === 7 ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 mb-3">Enabled On</div>
                      <div className="flex justify-between gap-3">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`w-12 h-12 rounded-full text-sm font-medium transition-all ${
                              newRoutine.days_of_week.includes(day.value)
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {day.label.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 flex gap-2">
                    <button
                      onClick={handleSaveRoutine}
                      disabled={saving || !newRoutine.placement_id || newRoutine.days_of_week.length === 0}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {saving ? (editingRoutineId ? 'Updating...' : 'Adding...') : (editingRoutineId ? 'Update Routine' : 'Add Routine')}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
                            type="button"
                            onClick={(e) => {
                              alert('BUTTON CLICKED! Routine ID: ' + routine.id);
                              console.log('BUTTON CLICKED!!!', routine.id);
                              console.log('showAddForm:', showAddForm, 'editingRoutineId:', editingRoutineId);
                              e.preventDefault();
                              e.stopPropagation();
                              handleStartEdit(routine, e);
                            }}
                            disabled={showAddForm && editingRoutineId !== routine.id}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit routine"
                          >
                            {editingRoutineId === routine.id ? 'Editing...' : 'Edit'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleStatus(routine);
                            }}
                            disabled={showAddForm}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              routine.status === 'active'
                                ? 'hover:bg-amber-50 text-amber-600'
                                : 'hover:bg-green-50 text-green-600'
                            }`}
                            title={routine.status === 'active' ? 'Pause routine' : 'Activate routine'}
                          >
                            {routine.status === 'active' ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteRoutine(routine.id!);
                            }}
                            disabled={showAddForm}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
