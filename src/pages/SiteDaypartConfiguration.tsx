import { useState, useEffect } from 'react';
import { Clock, Edit2, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TimeGroupManager from '../components/TimeGroupManager';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string;
  color: string;
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

interface TimeGroup {
  id?: string;
  days: number[];
  startTime: string;
  endTime: string;
}

interface EditFormProps {
  daypartDefinition: DaypartDefinition;
  routines: SiteDaypartRoutine[];
  placementGroupId: string;
  onSave: (routines: SiteDaypartRoutine[]) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ daypartDefinition, routines, placementGroupId, onSave, onCancel }: EditFormProps) {
  const existingGroups: TimeGroup[] = routines.map(r => ({
    id: r.id,
    days: r.days_of_week,
    startTime: r.start_time,
    endTime: r.end_time
  }));

  const handleSaveGroups = (groups: TimeGroup[]) => {
    const convertedRoutines: SiteDaypartRoutine[] = groups.map(g => ({
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
            {routines.map((routine, index) => {
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
                <div key={routine.id || index} className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{getGroupLabel(routine.days_of_week)}</h4>
                      <p className="text-sm text-slate-600">
                        {formatTime(routine.start_time)} - {formatTime(routine.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {routine.days_of_week.sort().map((day) => {
                      const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                      return (
                        <span
                          key={day}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium"
                        >
                          {dayInfo?.short}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="px-6 py-4 bg-slate-50">
          <p className="text-sm text-slate-600 mb-3">
            This daypart is not configured for this site. Click "Edit" to set up site-specific schedules.
          </p>
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
      .from('placement_daypart_overrides')
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
          .from('placement_daypart_overrides')
          .delete()
          .in('id', existingIds);
      }

      if (routines.length > 0) {
        const { error: insertError } = await supabase
          .from('placement_daypart_overrides')
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
        .from('placement_daypart_overrides')
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
