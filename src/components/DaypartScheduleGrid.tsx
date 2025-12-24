import { useState } from 'react';
import { Clock, Trash2, MapPin, Calendar, Sparkles, Pencil } from 'lucide-react';

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
  schedule_type?: string;
  schedule_name?: string;
  event_name?: string;
  event_date?: string;
  recurrence_config?: any;
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
  onSaveTimeChanges: (changes: Array<{ id: string; start_time: string; end_time: string }>) => void;
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
  onSaveTimeChanges,
}: DaypartScheduleGridProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const handleTimeBlur = (scheduleId: string, field: 'start_time' | 'end_time', value: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    if (value !== schedule[field]) {
      const updatedTimes = {
        start_time: field === 'start_time' ? value : schedule.start_time,
        end_time: field === 'end_time' ? value : schedule.end_time,
      };

      onSaveTimeChanges([{
        id: scheduleId,
        ...updatedTimes
      }]);
    }
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Daypart Schedules</h3>
            <span className="text-sm text-slate-600">
              ({sortedSchedules.length} schedule{sortedSchedules.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-600 flex items-center gap-4">
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
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                editMode
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
              }`}
            >
              <Pencil className="w-4 h-4" />
              <span className="text-sm font-medium">{editMode ? 'Editing Times' : 'Edit Times'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Daypart
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Schedule Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Scope
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Active Days
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Time Range
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedSchedules.map((schedule) => {
              const modified = isModified(schedule.id);
              const isHovered = hoveredRow === schedule.id;

              return (
                <tr
                  key={schedule.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    modified ? 'bg-amber-50 border-l-4 border-amber-400' : ''
                  }`}
                  onMouseEnter={() => setHoveredRow(schedule.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${schedule.daypart_color.replace('text-', 'bg-').split(' ')[0]}`}
                      ></div>
                      <span className="font-medium text-sm text-slate-900">{schedule.daypart_label}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {schedule.event_name ? (
                      <div className="inline-flex items-center gap-2">
                        {schedule.schedule_type?.includes('event') ? (
                          <Sparkles className="w-4 h-4 text-purple-500" />
                        ) : (
                          <Calendar className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-md font-medium shadow-sm">
                          {schedule.event_name}
                        </span>
                      </div>
                    ) : schedule.schedule_name ? (
                      <span className="text-sm text-slate-600 italic">{schedule.schedule_name}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {schedule.type === 'override' && schedule.placement_name ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium inline-flex">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{schedule.placement_name}</span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium inline-flex">
                        Base Schedule
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {schedule.schedule_type && (schedule.schedule_type.includes('holiday') || schedule.schedule_type.includes('event')) ? (
                      <div className="text-sm text-slate-700">
                        {schedule.recurrence_type === 'annual_date_range' && schedule.recurrence_config?.range_start_date && schedule.recurrence_config?.range_end_date ? (
                          <>
                            {new Date(schedule.recurrence_config.range_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            <span className="text-slate-400 mx-1">→</span>
                            {new Date(schedule.recurrence_config.range_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </>
                        ) : schedule.recurrence_type === 'none' && schedule.event_date ? (
                          new Date(schedule.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        ) : schedule.recurrence_type && schedule.recurrence_type !== 'none' ? (
                          <span className="italic text-slate-600">
                            {formatRecurrenceText(schedule.recurrence_type as any, schedule.recurrence_config, schedule.event_date)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No date specified</span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        {schedule.days_of_week.map(day => (
                          <div
                            key={day}
                            className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                            title={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
                          >
                            {DAYS_OF_WEEK[day].label}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {editMode ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={schedule.start_time}
                          onBlur={(e) => handleTimeBlur(schedule.id, 'start_time', e.target.value)}
                          placeholder="HH:MM:SS"
                          className="w-24 px-2 py-1 text-sm text-slate-900 font-medium border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-slate-400">→</span>
                        <input
                          type="text"
                          defaultValue={schedule.end_time}
                          onBlur={(e) => handleTimeBlur(schedule.id, 'end_time', e.target.value)}
                          placeholder="HH:MM:SS"
                          className="w-24 px-2 py-1 text-sm text-slate-900 font-medium border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                        <span>{schedule.start_time}</span>
                        <span className="text-slate-400">→</span>
                        <span>{schedule.end_time}</span>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className={`flex items-center justify-end gap-1 transition-opacity ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <button
                        onClick={() => onDelete(schedule)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
