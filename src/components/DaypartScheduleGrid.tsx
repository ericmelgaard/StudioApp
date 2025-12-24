import { useState } from 'react';
import { Clock, Edit2, Trash2, AlertCircle, MapPin } from 'lucide-react';

interface DaypartDefinition {
  id: string;
  display_label: string;
  sort_order: number;
  color: string;
  concept_id: number | null;
  store_id: number | null;
}

interface PlacementGroup {
  id: string;
  name: string;
  parent_id: string | null;
  store_id: number;
}

interface UnifiedScheduleRow {
  id: string;
  type: 'base' | 'override';
  daypart_definition_id: string;
  daypart_label: string;
  daypart_color: string;
  placement_id?: string;
  placement_name?: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
}

interface FilterOptions {
  dayparts: string[];
  placements: string[];
  showModifiedOnly: boolean;
  showOverridesOnly: boolean;
}

interface StagedChange {
  change_type: string;
  target_table: string;
  target_id?: string;
  change_data: any;
}

interface DaypartScheduleGridProps {
  schedules: UnifiedScheduleRow[];
  filterOptions: FilterOptions;
  stagedChanges: StagedChange[];
  onEdit: (schedule: UnifiedScheduleRow) => void;
  onDelete: (schedule: UnifiedScheduleRow) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export default function DaypartScheduleGrid({
  schedules,
  filterOptions,
  stagedChanges,
  onEdit,
  onDelete,
}: DaypartScheduleGridProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const formatDayGroup = (days: number[]): string => {
    if (days.length === 7) return 'All Days';
    if (days.length === 0) return 'No Days';

    const sorted = [...days].sort();

    if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) return 'Mon-Fri';
    if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return 'Sat-Sun';
    if (sorted.length === 1) return DAYS_OF_WEEK[sorted[0]].label;

    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          ranges.push(DAYS_OF_WEEK[start].label);
        } else if (end === start + 1) {
          ranges.push(`${DAYS_OF_WEEK[start].label}, ${DAYS_OF_WEEK[end].label}`);
        } else {
          ranges.push(`${DAYS_OF_WEEK[start].label}-${DAYS_OF_WEEK[end].label}`);
        }
        start = sorted[i];
        end = sorted[i];
      }
    }

    if (start === end) {
      ranges.push(DAYS_OF_WEEK[start].label);
    } else if (end === start + 1) {
      ranges.push(`${DAYS_OF_WEEK[start].label}, ${DAYS_OF_WEEK[end].label}`);
    } else {
      ranges.push(`${DAYS_OF_WEEK[start].label}-${DAYS_OF_WEEK[end].label}`);
    }

    return ranges.join(', ');
  };

  const isModified = (scheduleId: string) => {
    return stagedChanges.some(
      change => change.target_id === scheduleId
    );
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (filterOptions.dayparts.length > 0 && !filterOptions.dayparts.includes(schedule.daypart_definition_id)) {
      return false;
    }
    if (filterOptions.placements.length > 0) {
      if (schedule.type === 'override' && !filterOptions.placements.includes(schedule.placement_id || '')) {
        return false;
      }
      if (schedule.type === 'base') {
        return false;
      }
    }
    if (filterOptions.showOverridesOnly && schedule.type !== 'override') {
      return false;
    }
    if (filterOptions.showModifiedOnly && !isModified(schedule.id)) {
      return false;
    }
    return true;
  });

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    if (a.daypart_label !== b.daypart_label) {
      return a.daypart_label.localeCompare(b.daypart_label);
    }
    if (a.type !== b.type) {
      return a.type === 'base' ? -1 : 1;
    }
    if (a.placement_name && b.placement_name) {
      return a.placement_name.localeCompare(b.placement_name);
    }
    return 0;
  });

  if (sortedSchedules.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Schedules to Display</h3>
        <p className="text-slate-600">
          Adjust your filters or add daypart schedules to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Daypart Schedules</h3>
          <span className="text-sm text-slate-600">
            ({sortedSchedules.length} schedule{sortedSchedules.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-600 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span>
            Base Schedule
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></span>
            Placement Override
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span>
            Modified
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {sortedSchedules.map((schedule) => {
          const modified = isModified(schedule.id);
          const isHovered = hoveredRow === schedule.id;

          return (
            <div
              key={schedule.id}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors ${
                modified ? 'bg-amber-50 border-l-4 border-amber-400' : ''
              }`}
              onMouseEnter={() => setHoveredRow(schedule.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div className="flex items-center gap-2 w-48">
                <div
                  className={`w-3 h-3 rounded-full ${schedule.daypart_color.replace('text-', 'bg-').split(' ')[0]}`}
                ></div>
                <span className="font-medium text-sm text-slate-900">{schedule.daypart_label}</span>
              </div>

              {schedule.type === 'override' && schedule.placement_name && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                  <MapPin className="w-3 h-3" />
                  {schedule.placement_name}
                </div>
              )}

              {schedule.type === 'base' && (
                <div className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                  Base Schedule
                </div>
              )}

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                  {formatDayGroup(schedule.days_of_week)}
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-900 font-medium">
                  <span>{schedule.start_time}</span>
                  <span className="text-slate-400">→</span>
                  <span>{schedule.end_time}</span>
                </div>
              </div>

              <div className={`flex items-center gap-1 transition-opacity ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
                <button
                  onClick={() => onEdit(schedule)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit schedule"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(schedule)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
