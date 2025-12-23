import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string;
  color: string;
  default_start_time: string;
  default_end_time: string;
  default_days: number[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface SiteDaypartRoutine {
  id?: string;
  placement_group_id: string;
  daypart_definition_id: string;
  daypart_name?: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
}

interface DayConfiguration {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
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

interface EditFormProps {
  daypartDefinition: DaypartDefinition;
  routines: SiteDaypartRoutine[];
  placementGroupId: string;
  onSave: (routines: SiteDaypartRoutine[]) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ daypartDefinition, routines, placementGroupId, onSave, onCancel }: EditFormProps) {
  const [localRoutines, setLocalRoutines] = useState<SiteDaypartRoutine[]>([]);

  useEffect(() => {
    if (routines.length > 0) {
      setLocalRoutines([...routines]);
    } else {
      setLocalRoutines([{
        placement_group_id: placementGroupId,
        daypart_definition_id: daypartDefinition.id,
        days_of_week: [...daypartDefinition.default_days],
        start_time: daypartDefinition.default_start_time,
        end_time: daypartDefinition.default_end_time
      }]);
    }
  }, [routines, daypartDefinition, placementGroupId]);

  const addRoutine = () => {
    setLocalRoutines([
      ...localRoutines,
      {
        placement_group_id: placementGroupId,
        daypart_definition_id: daypartDefinition.id,
        days_of_week: [],
        start_time: daypartDefinition.default_start_time,
        end_time: daypartDefinition.default_end_time
      }
    ]);
  };

  const removeRoutine = (index: number) => {
    setLocalRoutines(localRoutines.filter((_, i) => i !== index));
  };

  const updateRoutine = (index: number, field: keyof SiteDaypartRoutine, value: any) => {
    setLocalRoutines(localRoutines.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const toggleDay = (index: number, day: number) => {
    const routine = localRoutines[index];
    const newDays = routine.days_of_week.includes(day)
      ? routine.days_of_week.filter(d => d !== day)
      : [...routine.days_of_week, day].sort();
    updateRoutine(index, 'days_of_week', newDays);
  };

  const handleSave = async () => {
    const validRoutines = localRoutines.filter(r => r.days_of_week.length > 0);
    await onSave(validRoutines);
  };

  return (
    <div className="px-6 py-4 bg-white border-t border-slate-200">
      <div className="space-y-4">
        {localRoutines.map((routine, index) => (
          <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">
                Routine {index + 1}
              </h4>
              {localRoutines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoutine(index)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={routine.start_time}
                  onChange={(e) => updateRoutine(index, 'start_time', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={routine.end_time}
                  onChange={(e) => updateRoutine(index, 'end_time', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(index, day.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      routine.days_of_week.includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRoutine}
          className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Another Routine
        </button>
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

interface DaypartCardProps {
  daypartDefinition: DaypartDefinition;
  routines: SiteDaypartRoutine[];
  isEditing: boolean;
  placementGroupId: string;
  onEdit: () => void;
  onSave: (routines: SiteDaypartRoutine[]) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}

function DaypartCard({
  daypartDefinition,
  routines,
  isEditing,
  placementGroupId,
  onEdit,
  onSave,
  onCancel,
  onDelete
}: DaypartCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const isConfigured = routines.length > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className={`px-6 py-4 ${isEditing ? '' : 'border-b border-slate-200'} ${daypartDefinition.color}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {daypartDefinition.display_label}
              {!isConfigured && !isEditing && (
                <span className="text-xs px-2 py-1 bg-white/50 rounded font-medium">Not Configured</span>
              )}
              {isEditing && (
                <span className="text-xs px-2 py-1 bg-white/50 rounded font-medium">Editing</span>
              )}
            </h3>
            <p className="text-sm opacity-90 mt-1">{daypartDefinition.description}</p>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Edit site daypart"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {isConfigured && (
                <button
                  onClick={onDelete}
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

      {isEditing ? (
        <EditForm
          daypartDefinition={daypartDefinition}
          routines={routines}
          placementGroupId={placementGroupId}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : isConfigured ? (
        <div className="px-6 py-4 bg-slate-50">
          <div className="space-y-3">
            {routines.map((routine, index) => (
              <div key={routine.id || index} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {routine.start_time} - {routine.end_time}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {routine.days_of_week.sort().map((day) => {
                    const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                    return (
                      <span
                        key={day}
                        className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded font-medium"
                      >
                        {dayInfo?.short}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Default Configuration (from Global Definition)
            </button>

            {showDetails && (
              <div className="mt-2 p-3 bg-slate-100 rounded text-sm">
                <div className="text-slate-600">
                  <div><span className="font-medium">Default Time:</span> {daypartDefinition.default_start_time} - {daypartDefinition.default_end_time}</div>
                  <div className="mt-1">
                    <span className="font-medium">Default Days:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {daypartDefinition.default_days.sort().map((day) => {
                        const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                        return (
                          <span key={day} className="px-2 py-1 bg-white text-slate-600 text-xs rounded">
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
        </div>
      ) : (
        <div className="px-6 py-4 bg-slate-50">
          <p className="text-sm text-slate-600 mb-3">
            This daypart is not configured for this site. Default configuration from global definition:
          </p>
          <div className="text-sm text-slate-700">
            <div><span className="font-medium">Time:</span> {daypartDefinition.default_start_time} - {daypartDefinition.default_end_time}</div>
            <div className="mt-1">
              <span className="font-medium">Days:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {daypartDefinition.default_days.sort().map((day) => {
                  const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                  return (
                    <span key={day} className="px-2 py-1 bg-white text-slate-600 text-xs rounded border border-slate-200">
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
  );
}

interface SiteDaypartConfigurationProps {
  placementGroupId: string;
  siteName: string;
  onBack: () => void;
}

export default function SiteDaypartConfiguration({ placementGroupId, siteName, onBack }: SiteDaypartConfigurationProps) {
  const [daypartDefinitions, setDaypartDefinitions] = useState<DaypartDefinition[]>([]);
  const [siteRoutines, setSiteRoutines] = useState<SiteDaypartRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDaypartId, setEditingDaypartId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [placementGroupId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadDaypartDefinitions(), loadSiteRoutines()]);
    setLoading(false);
  };

  const loadDaypartDefinitions = async () => {
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error loading daypart definitions:', error);
      setError('Failed to load daypart definitions');
    } else {
      setDaypartDefinitions(data || []);
    }
  };

  const loadSiteRoutines = async () => {
    const { data, error } = await supabase
      .from('site_daypart_routines')
      .select('*')
      .eq('placement_group_id', placementGroupId);

    if (error) {
      console.error('Error loading site routines:', error);
    } else {
      setSiteRoutines(data || []);
    }
  };

  const handleSave = async (daypartId: string, routines: SiteDaypartRoutine[]) => {
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
            placement_group_id: placementGroupId,
            daypart_definition_id: daypartId,
            days_of_week: r.days_of_week,
            start_time: r.start_time,
            end_time: r.end_time
          })));

        if (insertError) throw insertError;
      }

      setEditingDaypartId(null);
      await loadSiteRoutines();
    } catch (err: any) {
      setError(err.message || 'Failed to save routines');
    }
  };

  const handleDelete = async (daypartId: string) => {
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
        setError('Failed to delete routines');
      } else {
        await loadSiteRoutines();
      }
    }
  };

  const getRoutinesForDaypart = (daypartId: string) => {
    return siteRoutines.filter(r => r.daypart_definition_id === daypartId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Site Configuration
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Site Dayparts: {siteName}</h1>
        <p className="text-slate-600">
          Configure site-specific daypart schedules. These inherit from global daypart definitions and can be customized per site.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {daypartDefinitions.map((definition) => (
          <DaypartCard
            key={definition.id}
            daypartDefinition={definition}
            routines={getRoutinesForDaypart(definition.id)}
            isEditing={editingDaypartId === definition.id}
            placementGroupId={placementGroupId}
            onEdit={() => setEditingDaypartId(definition.id)}
            onSave={(routines) => handleSave(definition.id, routines)}
            onCancel={() => setEditingDaypartId(null)}
            onDelete={() => handleDelete(definition.id)}
          />
        ))}
      </div>

      {daypartDefinitions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Daypart Definitions Available</h3>
          <p className="text-slate-600 text-sm">
            Create global daypart definitions in the WAND settings first.
          </p>
        </div>
      )}
    </div>
  );
}
