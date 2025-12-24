import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, Download, Upload, X, Calendar, Plus } from 'lucide-react';
import DaypartScheduleGrid from './DaypartScheduleGrid';
import ChangesStagingPanel from './ChangesStagingPanel';
import DaypartFilterToolbar from './DaypartFilterToolbar';
import PublishScheduleModal from './PublishScheduleModal';

interface DaypartAdvancedViewProps {
  locationId: number | null;
  conceptId: number | null;
  onClose: () => void;
}

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  sort_order: number;
  color: string;
  concept_id: number | null;
  store_id: number | null;
}

interface DaypartSchedule {
  id: string;
  daypart_definition_id: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  schedule_type?: string;
  schedule_name?: string;
  event_name?: string;
}

interface PlacementGroup {
  id: string;
  name: string;
  parent_id: string | null;
  store_id: number;
}

interface PlacementOverride {
  id: string;
  placement_group_id: string;
  daypart_definition_id: string;
  daypart_name?: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  schedule_type?: string;
  schedule_name?: string;
  event_name?: string;
}

interface UnifiedScheduleRow {
  id: string;
  type: 'base' | 'override';
  source: 'routine' | 'override';
  daypart_definition_id: string;
  daypart_label: string;
  daypart_color: string;
  placement_id?: string;
  placement_name?: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  schedule_type?: string;
  schedule_name?: string;
  event_name?: string;
}

interface StagedChange {
  id?: string;
  change_type: 'create' | 'update' | 'delete';
  target_table: string;
  target_id?: string;
  change_data: any;
  notes?: string;
}

export default function DaypartAdvancedView({ locationId, conceptId, onClose }: DaypartAdvancedViewProps) {
  const [definitions, setDefinitions] = useState<DaypartDefinition[]>([]);
  const [schedules, setSchedules] = useState<DaypartSchedule[]>([]);
  const [placements, setPlacements] = useState<PlacementGroup[]>([]);
  const [overrides, setOverrides] = useState<PlacementOverride[]>([]);
  const [unifiedSchedules, setUnifiedSchedules] = useState<UnifiedScheduleRow[]>([]);
  const [stagedChanges, setStagedChanges] = useState<StagedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStagingPanel, setShowStagingPanel] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    dayparts: [] as string[],
    placements: [] as string[],
    showModifiedOnly: false,
    showOverridesOnly: false,
  });

  useEffect(() => {
    loadAllData();
  }, [locationId, conceptId]);

  useEffect(() => {
    if (stagedChanges.length > 0) {
      setShowStagingPanel(true);
    }
  }, [stagedChanges.length]);

  useEffect(() => {
    combineSchedules();
  }, [definitions, schedules, overrides, placements]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDefinitions(),
        loadSchedules(),
        loadPlacements(),
        loadOverrides(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDefinitions = async () => {
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('*')
      .order('sort_order');

    if (!error && data) {
      setDefinitions(data);
    } else if (error) {
      console.error('Error loading definitions:', error);
    }
  };

  const loadSchedules = async () => {
    const { data, error } = await supabase
      .from('daypart_schedules')
      .select('*');

    if (!error && data) {
      setSchedules(data);
    } else if (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadPlacements = async () => {
    if (!locationId) {
      console.log('No location selected, clearing placements');
      setPlacements([]);
      return;
    }

    console.log('Loading placements for location:', locationId);
    const { data, error } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('store_id', locationId)
      .order('name');

    if (!error && data) {
      console.log('Loaded placements:', data);
      setPlacements(data);
    } else if (error) {
      console.error('Error loading placements:', error);
    }
  };

  const loadOverrides = async () => {
    if (!locationId) {
      console.log('No location selected, clearing overrides');
      setOverrides([]);
      return;
    }

    console.log('Loading overrides for location:', locationId);
    const { data: placementIds, error: placementError } = await supabase
      .from('placement_groups')
      .select('id')
      .eq('store_id', locationId);

    if (placementError) {
      console.error('Error loading placement IDs:', placementError);
      setOverrides([]);
      return;
    }

    if (!placementIds || placementIds.length === 0) {
      console.log('No placements found for this location');
      setOverrides([]);
      return;
    }

    const ids = placementIds.map(p => p.id);
    console.log('Placement IDs:', ids);

    const { data, error } = await supabase
      .from('placement_daypart_overrides')
      .select('*')
      .in('placement_group_id', ids);

    if (!error && data) {
      console.log('Loaded overrides:', data);
      setOverrides(data);
    } else if (error) {
      console.error('Error loading overrides:', error);
    }
  };

  const combineSchedules = () => {
    const unified: UnifiedScheduleRow[] = [];

    console.log('Combining schedules:', {
      schedules: schedules.length,
      overrides: overrides.length,
      placements: placements.length,
      definitions: definitions.length,
    });

    schedules.forEach(schedule => {
      const definition = definitions.find(d => d.id === schedule.daypart_definition_id);

      if (definition) {
        unified.push({
          id: schedule.id,
          type: 'base',
          source: 'routine',
          daypart_definition_id: definition.id,
          daypart_label: definition.display_label,
          daypart_color: definition.color,
          days_of_week: schedule.days_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          schedule_type: schedule.schedule_type,
          schedule_name: schedule.schedule_name,
          event_name: schedule.event_name,
        });
      }
    });

    console.log('Processing overrides:', overrides);
    overrides.forEach(override => {
      let definition = definitions.find(d => d.id === override.daypart_definition_id);

      if (!definition && override.daypart_name) {
        definition = definitions.find(d =>
          d.daypart_name && d.daypart_name.toLowerCase() === override.daypart_name.toLowerCase()
        );
      }

      const placement = placements.find(p => p.id === override.placement_group_id);

      console.log('Override:', {
        override_id: override.id,
        placement_group_id: override.placement_group_id,
        daypart_definition_id: override.daypart_definition_id,
        daypart_name: override.daypart_name,
        found_definition: !!definition,
        found_by: definition ? (override.daypart_definition_id ? 'id' : 'name') : null,
        found_placement: !!placement,
      });

      if (definition && placement) {
        unified.push({
          id: override.id,
          type: 'override',
          source: 'override',
          daypart_definition_id: definition.id,
          daypart_label: definition.display_label,
          daypart_color: definition.color,
          placement_id: placement.id,
          placement_name: placement.name,
          days_of_week: override.days_of_week,
          start_time: override.start_time,
          end_time: override.end_time,
          schedule_type: override.schedule_type,
          schedule_name: override.schedule_name,
          event_name: override.event_name,
        });
      } else {
        console.warn('Override missing definition or placement:', {
          override,
          has_definition: !!definition,
          has_placement: !!placement,
        });
      }
    });

    console.log('Unified schedules:', unified);
    setUnifiedSchedules(unified);
  };

  const handleEdit = (schedule: UnifiedScheduleRow) => {
    console.log('Edit schedule:', schedule);
  };

  const handleDelete = (schedule: UnifiedScheduleRow) => {
    const change: StagedChange = {
      change_type: 'delete',
      target_table: schedule.source === 'routine' ? 'daypart_schedules' : 'placement_daypart_overrides',
      target_id: schedule.id,
      change_data: {},
    };

    setStagedChanges(prev => [...prev, change]);
  };

  const handleSaveTimeChanges = (changes: Array<{ id: string; start_time: string; end_time: string }>) => {
    setStagedChanges(prev => {
      const updated = [...prev];

      changes.forEach(change => {
        const schedule = unifiedSchedules.find(s => s.id === change.id);
        if (!schedule) return;

        const existingIndex = updated.findIndex(
          staged => staged.target_id === change.id && staged.change_type === 'update'
        );

        const newChange: StagedChange = {
          change_type: 'update' as const,
          target_table: schedule.source === 'routine' ? 'daypart_schedules' : 'placement_daypart_overrides',
          target_id: change.id,
          change_data: {
            start_time: change.start_time,
            end_time: change.end_time,
          },
          notes: `Updated times to ${change.start_time} - ${change.end_time}`,
        };

        if (existingIndex >= 0) {
          updated[existingIndex] = newChange;
        } else {
          updated.push(newChange);
        }
      });

      return updated;
    });
    setShowStagingPanel(true);
  };

  const handleCancelChanges = () => {
    if (stagedChanges.length > 0) {
      if (confirm('Discard all pending changes?')) {
        setStagedChanges([]);
        setShowStagingPanel(false);
      }
    } else {
      onClose();
    }
  };

  const handlePublish = () => {
    setShowPublishModal(true);
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['Daypart Name', 'Scope', 'Placement', 'Active Days', 'Start Time', 'End Time'].join(',')
    ];

    unifiedSchedules.forEach(schedule => {
      const scope = schedule.type === 'base' ? 'Site' : 'Placement';
      const placementName = schedule.placement_name || 'Site Root';
      const daysStr = schedule.days_of_week
        .map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
        .join(';');

      csvRows.push([
        schedule.daypart_label,
        scope,
        placementName,
        daysStr,
        schedule.start_time,
        schedule.end_time,
      ].join(','));
    });

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daypart-schedules-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const rows = text.split('\n').slice(1);

      console.log('CSV import:', rows.length, 'rows');
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Advanced Daypart Management</h2>
              <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                POWER USER MODE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleImportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={handleCancelChanges}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
                {stagedChanges.length > 0 ? 'Cancel' : 'Exit'}
              </button>
            </div>
          </div>

          <DaypartFilterToolbar
            definitions={definitions}
            placements={placements}
            filterOptions={filterOptions}
            onFilterChange={setFilterOptions}
          />
        </div>
      </div>

      <div className="max-w-full px-6 py-6">
        <div className="flex gap-6">
          <div className={`transition-all duration-300 ${showStagingPanel ? 'flex-1' : 'w-full'}`}>
            <DaypartScheduleGrid
              schedules={unifiedSchedules}
              filterOptions={filterOptions}
              stagedChanges={stagedChanges}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSaveTimeChanges={handleSaveTimeChanges}
            />
          </div>

          {showStagingPanel && (
            <div className="w-96 flex-shrink-0">
              <ChangesStagingPanel
                stagedChanges={stagedChanges}
                definitions={definitions}
                schedules={schedules}
                onRemoveChange={(index) => setStagedChanges(prev => prev.filter((_, i) => i !== index))}
                onClearAll={() => setStagedChanges([])}
                onClose={() => setShowStagingPanel(false)}
                onPublish={handlePublish}
              />
            </div>
          )}
        </div>
      </div>

      {showPublishModal && (
        <PublishScheduleModal
          stagedChanges={stagedChanges}
          locationId={locationId}
          onClose={() => setShowPublishModal(false)}
          onPublished={() => {
            setShowPublishModal(false);
            setStagedChanges([]);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
