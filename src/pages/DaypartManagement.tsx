import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, AlertCircle, MapPin, Building2, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconPicker from '../components/IconPicker';
import TimeGroupManager from '../components/TimeGroupManager';
import { useLocation } from '../hooks/useLocation';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  concept_id: number | null;
  store_id: number | null;
}

interface DaypartSchedule {
  id?: string;
  daypart_definition_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
}

interface SiteRoutine {
  id?: string;
  placement_group_id: string;
  daypart_definition_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
}

interface TimeGroup {
  id?: string;
  days: number[];
  startTime: string;
  endTime: string;
}

type ContextLevel = 'wand' | 'concept' | 'company' | 'store';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

interface EditFormProps {
  daypartDefinition: DaypartDefinition;
  schedules: DaypartSchedule[];
  onSave: (schedules: DaypartSchedule[]) => Promise<void>;
  onCancel: () => void;
}

function ScheduleEditForm({ daypartDefinition, schedules, onSave, onCancel }: EditFormProps) {
  const existingGroups: TimeGroup[] = schedules.map(s => ({
    id: s.id,
    days: s.days_of_week,
    startTime: s.start_time,
    endTime: s.end_time
  }));

  const handleSaveGroups = (groups: TimeGroup[]) => {
    const convertedSchedules: DaypartSchedule[] = groups.map(g => ({
      id: g.id,
      daypart_definition_id: daypartDefinition.id,
      days_of_week: g.days,
      start_time: g.startTime,
      end_time: g.endTime
    }));
    onSave(convertedSchedules);
  };

  return (
    <TimeGroupManager
      defaultStartTime="06:00:00"
      defaultEndTime="11:00:00"
      existingGroups={existingGroups}
      onSave={handleSaveGroups}
      onCancel={onCancel}
      color={daypartDefinition.color}
    />
  );
}

interface SiteRoutineEditFormProps {
  daypartDefinition: DaypartDefinition;
  routines: SiteRoutine[];
  placementGroupId: string;
  onSave: (routines: SiteRoutine[]) => Promise<void>;
  onCancel: () => void;
}

function SiteRoutineEditForm({ daypartDefinition, routines, placementGroupId, onSave, onCancel }: SiteRoutineEditFormProps) {
  const existingGroups: TimeGroup[] = routines.map(r => ({
    id: r.id,
    days: r.days_of_week,
    startTime: r.start_time,
    endTime: r.end_time
  }));

  const handleSaveGroups = (groups: TimeGroup[]) => {
    const convertedRoutines: SiteRoutine[] = groups.map(g => ({
      id: g.id,
      placement_group_id: placementGroupId,
      daypart_definition_id: daypartDefinition.id,
      days_of_week: g.days,
      start_time: g.startTime,
      end_time: g.endTime
    }));
    onSave(convertedRoutines);
  };

  return (
    <TimeGroupManager
      defaultStartTime="06:00:00"
      defaultEndTime="11:00:00"
      existingGroups={existingGroups}
      onSave={handleSaveGroups}
      onCancel={onCancel}
      color={daypartDefinition.color}
    />
  );
}

export default function DaypartManagement() {
  const { location, getLocationBreadcrumb } = useLocation();
  const [contextLevel, setContextLevel] = useState<ContextLevel>('wand');
  const [currentConceptId, setCurrentConceptId] = useState<number | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);
  const [siteRootPlacementId, setSiteRootPlacementId] = useState<string | null>(null);

  const [definitions, setDefinitions] = useState<DaypartDefinition[]>([]);
  const [allSchedules, setAllSchedules] = useState<DaypartSchedule[]>([]);
  const [siteRoutines, setSiteRoutines] = useState<SiteRoutine[]>([]);

  const [loading, setLoading] = useState(true);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<DaypartDefinition | null>(null);
  const [editingScheduleForDef, setEditingScheduleForDef] = useState<string | null>(null);
  const [editingSiteRoutineForDef, setEditingSiteRoutineForDef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    daypart_name: '',
    display_label: '',
    description: '',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'Clock',
    sort_order: 0,
  });

  useEffect(() => {
    detectContextLevel();
  }, [location]);

  useEffect(() => {
    loadData();
  }, [contextLevel, currentConceptId, currentStoreId, siteRootPlacementId]);

  const detectContextLevel = async () => {
    if (location.store) {
      setCurrentStoreId(location.store.id);
      setCurrentConceptId(location.concept?.id || null);

      const { data: placementData } = await supabase
        .from('placement_groups')
        .select('id')
        .eq('store_id', location.store.id)
        .is('parent_id', null)
        .maybeSingle();

      setSiteRootPlacementId(placementData?.id || null);
      setContextLevel('store');
    } else if (location.concept) {
      setCurrentConceptId(location.concept.id);
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setContextLevel('concept');
    } else {
      setCurrentConceptId(null);
      setCurrentStoreId(null);
      setSiteRootPlacementId(null);
      setContextLevel('wand');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadDefinitions(), loadSchedules(), loadSiteRoutines()]);
    setLoading(false);
  };

  const loadDefinitions = async () => {
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('*')
      .or(
        contextLevel === 'store'
          ? `concept_id.eq.${currentConceptId},store_id.eq.${currentStoreId},and(concept_id.is.null,store_id.is.null)`
          : contextLevel === 'concept'
          ? `concept_id.eq.${currentConceptId},and(concept_id.is.null,store_id.is.null)`
          : 'and(concept_id.is.null,store_id.is.null)'
      )
      .order('sort_order');

    if (error) {
      console.error('Error loading definitions:', error);
      setError('Failed to load daypart definitions');
    } else {
      setDefinitions(data || []);
    }
  };

  const loadSchedules = async () => {
    const { data, error } = await supabase
      .from('daypart_schedules')
      .select('*');

    if (error) {
      console.error('Error loading schedules:', error);
    } else {
      setAllSchedules(data || []);
    }
  };

  const loadSiteRoutines = async () => {
    if (!siteRootPlacementId) {
      setSiteRoutines([]);
      return;
    }

    const { data, error } = await supabase
      .from('site_daypart_routines')
      .select('*')
      .eq('placement_group_id', siteRootPlacementId);

    if (error) {
      console.error('Error loading site routines:', error);
    } else {
      setSiteRoutines(data || []);
    }
  };

  const handleSaveDefinition = async () => {
    try {
      const defData = {
        ...formData,
        concept_id: contextLevel === 'concept' || contextLevel === 'store' ? currentConceptId : null,
        store_id: contextLevel === 'store' ? currentStoreId : null,
      };

      if (editingDefinition) {
        const { error: updateError } = await supabase
          .from('daypart_definitions')
          .update(defData)
          .eq('id', editingDefinition.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('daypart_definitions')
          .insert([defData]);

        if (insertError) throw insertError;
      }

      setShowDefinitionForm(false);
      setEditingDefinition(null);
      setFormData({
        daypart_name: '',
        display_label: '',
        description: '',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: 'Clock',
        sort_order: 0,
      });
      await loadDefinitions();
    } catch (err: any) {
      console.error('Error saving definition:', err);
      setError(err.message || 'Failed to save daypart definition');
    }
  };

  const handleDeleteDefinition = async (definition: DaypartDefinition) => {
    if (!confirm(`Are you sure you want to delete "${definition.display_label}"?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('daypart_definitions')
        .delete()
        .eq('id', definition.id);

      if (deleteError) throw deleteError;

      await loadDefinitions();
    } catch (err: any) {
      console.error('Error deleting definition:', err);
      setError(err.message || 'Failed to delete definition');
    }
  };

  const handleSaveSchedule = async (daypartId: string, schedules: DaypartSchedule[]) => {
    try {
      const existingSchedules = allSchedules.filter(s => s.daypart_definition_id === daypartId);
      const existingIds = existingSchedules.map(s => s.id).filter(Boolean);

      if (existingIds.length > 0) {
        await supabase
          .from('daypart_schedules')
          .delete()
          .in('id', existingIds);
      }

      if (schedules.length > 0) {
        const { error: insertError } = await supabase
          .from('daypart_schedules')
          .insert(schedules.map(s => ({
            daypart_definition_id: daypartId,
            days_of_week: s.days_of_week,
            start_time: s.start_time,
            end_time: s.end_time
          })));

        if (insertError) throw insertError;
      }

      setEditingScheduleForDef(null);
      await loadSchedules();
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.message || 'Failed to save schedule');
    }
  };

  const handleSaveSiteRoutine = async (daypartId: string, routines: SiteRoutine[]) => {
    if (!siteRootPlacementId) return;

    try {
      const existingRoutines = siteRoutines.filter(r => r.daypart_definition_id === daypartId);
      const existingIds = existingRoutines.map(r => r.id).filter(Boolean);

      if (existingIds.length > 0) {
        await supabase
          .from('site_daypart_routines')
          .delete()
          .in('id', existingIds);
      }

      if (routines.length > 0) {
        const { error: insertError } = await supabase
          .from('site_daypart_routines')
          .insert(routines.map(r => ({
            placement_group_id: siteRootPlacementId,
            daypart_definition_id: daypartId,
            days_of_week: r.days_of_week,
            start_time: r.start_time,
            end_time: r.end_time
          })));

        if (insertError) throw insertError;
      }

      setEditingSiteRoutineForDef(null);
      await loadSiteRoutines();
    } catch (err: any) {
      console.error('Error saving site routine:', err);
      setError(err.message || 'Failed to save site routine');
    }
  };

  const handleDeleteSiteRoutine = async (daypartId: string) => {
    if (!confirm('Are you sure you want to clear the site configuration for this daypart?')) {
      return;
    }

    const routinesToDelete = siteRoutines
      .filter(r => r.daypart_definition_id === daypartId)
      .map(r => r.id)
      .filter(Boolean);

    if (routinesToDelete.length > 0) {
      const { error } = await supabase
        .from('site_daypart_routines')
        .delete()
        .in('id', routinesToDelete);

      if (error) {
        setError('Failed to delete site routines');
      } else {
        await loadSiteRoutines();
      }
    }
  };

  const getSchedulesForDefinition = (defId: string) => {
    return allSchedules.filter(s => s.daypart_definition_id === defId);
  };

  const getSiteRoutinesForDefinition = (defId: string) => {
    return siteRoutines.filter(r => r.daypart_definition_id === defId);
  };

  const renderDaypartCard = (definition: DaypartDefinition) => {
    const defSchedules = getSchedulesForDefinition(definition.id);
    const defSiteRoutines = getSiteRoutinesForDefinition(definition.id);

    const isDefinitionEditable =
      (definition.store_id === null && definition.concept_id === null && contextLevel === 'wand') ||
      (definition.concept_id !== null && definition.store_id === null && contextLevel === 'concept') ||
      (definition.store_id !== null && contextLevel === 'store');

    const canEditSchedule = isDefinitionEditable && contextLevel !== 'store';
    const canEditSiteRoutine = contextLevel === 'store';
    const hasSchedules = defSchedules.length > 0;
    const hasSiteRoutines = defSiteRoutines.length > 0;

    const isEditing = editingScheduleForDef === definition.id || editingSiteRoutineForDef === definition.id;
    const isConfigured = canEditSiteRoutine ? hasSiteRoutines : hasSchedules;

    return (
      <div key={definition.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className={`px-6 py-4 ${isEditing ? '' : 'border-b border-slate-200'} ${definition.color}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {definition.display_label}
                {!isConfigured && !isEditing && (
                  <span className="text-xs px-2 py-1 bg-white/50 rounded font-medium">Not Configured</span>
                )}
                {isEditing && (
                  <span className="text-xs px-2 py-1 bg-white/50 rounded font-medium">Editing</span>
                )}
              </h3>
              <p className="text-sm opacity-90 mt-1">{definition.description}</p>
            </div>
            {!isEditing && (
              <div className="flex items-center gap-2">
                {isDefinitionEditable && contextLevel !== 'store' && (
                  <button
                    onClick={() => {
                      setEditingDefinition(definition);
                      setFormData({
                        daypart_name: definition.daypart_name,
                        display_label: definition.display_label,
                        description: definition.description,
                        color: definition.color,
                        icon: definition.icon,
                        sort_order: definition.sort_order,
                      });
                      setShowDefinitionForm(true);
                    }}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Edit definition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {canEditSchedule && (
                  <button
                    onClick={() => setEditingScheduleForDef(definition.id)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Edit schedules"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {canEditSiteRoutine && (
                  <button
                    onClick={() => setEditingSiteRoutineForDef(definition.id)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Edit site daypart"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {isDefinitionEditable && contextLevel !== 'store' && (
                  <button
                    onClick={() => handleDeleteDefinition(definition)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Delete daypart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {canEditSiteRoutine && hasSiteRoutines && (
                  <button
                    onClick={() => handleDeleteSiteRoutine(definition.id)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Clear site configuration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {editingScheduleForDef === definition.id ? (
          <ScheduleEditForm
            daypartDefinition={definition}
            schedules={defSchedules}
            onSave={(schedules) => handleSaveSchedule(definition.id, schedules)}
            onCancel={() => setEditingScheduleForDef(null)}
          />
        ) : editingSiteRoutineForDef === definition.id ? (
          <SiteRoutineEditForm
            daypartDefinition={definition}
            routines={defSiteRoutines}
            placementGroupId={siteRootPlacementId!}
            onSave={(routines) => handleSaveSiteRoutine(definition.id, routines)}
            onCancel={() => setEditingSiteRoutineForDef(null)}
          />
        ) : isConfigured ? (
          <div className="px-6 py-4 bg-slate-50">
            <div className="space-y-3">
              {canEditSiteRoutine
                ? defSiteRoutines.map((routine, index) => renderScheduleCard(routine, index, definition.color))
                : defSchedules.map((schedule, index) => renderScheduleCard(schedule, index, definition.color))
              }
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 bg-slate-50">
            {canEditSiteRoutine && hasSchedules ? (
              <>
                <p className="text-sm text-slate-600 mb-3">
                  This daypart is not configured for this site. Click "Edit" to set up site-specific schedules.
                </p>
                <p className="text-xs text-slate-500 mb-3">Inherited schedules:</p>
                <div className="space-y-3 opacity-60">
                  {defSchedules.map((schedule, index) => renderScheduleCard(schedule, index, definition.color))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600 mb-3">
                This daypart is not configured. Click "Edit" to set up {canEditSiteRoutine ? 'site-specific ' : ''}schedules.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderScheduleCard = (schedule: DaypartSchedule | SiteRoutine, index: number, colorClass: string) => {
    const getGroupLabel = (days: number[]): string => {
      const sorted = [...days].sort();
      if (sorted.length === 7) return 'All Days';

      const isWeekdays = sorted.length === 5 && sorted.every(d => [1, 2, 3, 4, 5].includes(d));
      if (isWeekdays) return 'Weekdays';

      const isWeekend = sorted.length === 2 && sorted.every(d => [0, 6].includes(d));
      if (isWeekend) return 'Weekend';

      if (sorted.length === 1) {
        return DAYS_OF_WEEK.find(d => d.value === sorted[0])?.label || '';
      }

      return sorted.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ');
    };

    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return (
      <div key={schedule.id || index} className="p-4 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">{getGroupLabel(schedule.days_of_week)}</h4>
            <p className="text-sm text-slate-600">
              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {schedule.days_of_week.sort().map((day) => {
            const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
            return (
              <span
                key={day}
                className={`px-2.5 py-1 text-xs rounded-md font-medium ${colorClass}`}
              >
                {dayInfo?.short}
              </span>
            );
          })}
        </div>
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Clock className="w-7 h-7 text-blue-600" />
              Daypart Management
              {contextLevel === 'wand' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded-lg">
                  <Layers className="w-4 h-4" />
                  WAND Level
                </span>
              )}
              {contextLevel === 'concept' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-green-100 text-green-800 border border-green-300 rounded-lg">
                  <Layers className="w-4 h-4" />
                  Concept Level
                </span>
              )}
              {contextLevel === 'store' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded-lg">
                  <MapPin className="w-4 h-4" />
                  Store Level
                </span>
              )}
            </h1>
            <p className="text-slate-600 mt-1">
              {contextLevel === 'store'
                ? 'View inherited dayparts and create site-specific schedule overrides'
                : 'Define dayparts and their default schedules'}
            </p>
          </div>
          {contextLevel !== 'store' && !showDefinitionForm && (
            <button
              onClick={() => {
                setEditingDefinition(null);
                setFormData({
                  daypart_name: '',
                  display_label: '',
                  description: '',
                  color: 'bg-blue-100 text-blue-800 border-blue-300',
                  icon: 'Clock',
                  sort_order: definitions.length,
                });
                setShowDefinitionForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Daypart
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showDefinitionForm && (
        <div className="mb-6 bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingDefinition ? 'Edit Daypart' : 'Add New Daypart'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Daypart Name (System)
              </label>
              <input
                type="text"
                value={formData.daypart_name}
                onChange={(e) => setFormData({ ...formData, daypart_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="e.g., breakfast, lunch, dinner"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Label
              </label>
              <input
                type="text"
                value={formData.display_label}
                onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="e.g., Breakfast"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={2}
                placeholder="Description of this daypart"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Color
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="bg-blue-100 text-blue-800 border-blue-300">Blue</option>
                <option value="bg-green-100 text-green-800 border-green-300">Green</option>
                <option value="bg-orange-100 text-orange-800 border-orange-300">Orange</option>
                <option value="bg-red-100 text-red-800 border-red-300">Red</option>
                <option value="bg-slate-100 text-slate-800 border-slate-300">Gray</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDefinition}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowDefinitionForm(false);
                  setEditingDefinition(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {definitions.map((definition) => renderDaypartCard(definition))}
      </div>

      {definitions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Daypart Definitions Available</h3>
          <p className="text-slate-600 text-sm mb-4">
            {contextLevel === 'store'
              ? 'No daypart definitions have been created at WAND or concept level yet.'
              : 'Create your first daypart definition to get started.'}
          </p>
          {contextLevel !== 'store' && (
            <button
              onClick={() => {
                setEditingDefinition(null);
                setFormData({
                  daypart_name: '',
                  display_label: '',
                  description: '',
                  color: 'bg-blue-100 text-blue-800 border-blue-300',
                  icon: 'Clock',
                  sort_order: 0,
                });
                setShowDefinitionForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Daypart
            </button>
          )}
        </div>
      )}
    </div>
  );
}
