import { useState, useEffect, useRef } from 'react';
import { Clock, Edit2, AlertCircle } from 'lucide-react';

interface DaypartDefinition {
  id: string;
  display_label: string;
  sort_order: number;
  color: string;
  concept_id: number | null;
  store_id: number | null;
}

interface DaypartSchedule {
  id: string;
  daypart_definition_id: string;
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
  definitions: DaypartDefinition[];
  schedules: DaypartSchedule[];
  filterOptions: FilterOptions;
  stagedChanges: StagedChange[];
  onScheduleChange: (definitionId: string, day: number, newSchedule: { start_time: string; end_time: string }) => void;
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

export default function DaypartScheduleGrid({
  definitions,
  schedules,
  filterOptions,
  stagedChanges,
  onScheduleChange,
}: DaypartScheduleGridProps) {
  const [editingCell, setEditingCell] = useState<{ definitionId: string; day: number } | null>(null);
  const [editValues, setEditValues] = useState<{ start_time: string; end_time: string }>({ start_time: '', end_time: '' });
  const startTimeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && startTimeRef.current) {
      startTimeRef.current.focus();
    }
  }, [editingCell]);

  const filteredDefinitions = definitions.filter(def => {
    if (filterOptions.dayparts.length > 0 && !filterOptions.dayparts.includes(def.id)) {
      return false;
    }
    return true;
  });

  const getScheduleForCell = (definitionId: string, day: number) => {
    return schedules.find(
      s => s.daypart_definition_id === definitionId && s.days_of_week.includes(day)
    );
  };

  const isModified = (definitionId: string, day: number) => {
    return stagedChanges.some(
      change =>
        change.target_table === 'daypart_schedules' &&
        (change.change_data.daypart_definition_id === definitionId ||
         (change.target_id && schedules.find(s => s.id === change.target_id)?.daypart_definition_id === definitionId)) &&
        (change.change_data.days_of_week?.includes(day) ||
         schedules.find(s => s.id === change.target_id)?.days_of_week.includes(day))
    );
  };

  const handleCellClick = (definitionId: string, day: number) => {
    const schedule = getScheduleForCell(definitionId, day);
    setEditingCell({ definitionId, day });
    setEditValues({
      start_time: schedule?.start_time || '06:00',
      end_time: schedule?.end_time || '11:00',
    });
  };

  const handleSave = () => {
    if (editingCell && editValues.start_time && editValues.end_time) {
      onScheduleChange(editingCell.definitionId, editingCell.day, editValues);
      setEditingCell(null);
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab' && editingCell) {
      e.preventDefault();
      handleSave();

      const currentDayIndex = editingCell.day;
      const currentDefIndex = filteredDefinitions.findIndex(d => d.id === editingCell.definitionId);

      if (e.shiftKey) {
        if (currentDayIndex > 0) {
          handleCellClick(editingCell.definitionId, currentDayIndex - 1);
        } else if (currentDefIndex > 0) {
          handleCellClick(filteredDefinitions[currentDefIndex - 1].id, 6);
        }
      } else {
        if (currentDayIndex < 6) {
          handleCellClick(editingCell.definitionId, currentDayIndex + 1);
        } else if (currentDefIndex < filteredDefinitions.length - 1) {
          handleCellClick(filteredDefinitions[currentDefIndex + 1].id, 0);
        }
      }
    }
  };

  if (filteredDefinitions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Dayparts to Display</h3>
        <p className="text-slate-600">
          Adjust your filters or add daypart definitions to get started.
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
            ({filteredDefinitions.length} daypart{filteredDefinitions.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-600 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
            Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span>
            Modified
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-slate-100 border border-slate-300 rounded"></span>
            Not Set
          </span>
          <span className="ml-auto text-slate-500">
            Click any cell to edit • Tab to navigate • Enter to save • Esc to cancel
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 border-r border-slate-300 min-w-[200px]">
                Daypart
              </th>
              {DAYS_OF_WEEK.map(day => (
                <th key={day.value} className="px-3 py-3 text-center text-sm font-semibold text-slate-700 border-r border-slate-200 min-w-[140px]">
                  <div>{day.label}</div>
                  <div className="text-xs font-normal text-slate-500">{day.short}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredDefinitions.map((definition, defIndex) => (
              <tr key={definition.id} className="hover:bg-slate-50 transition-colors">
                <td className={`sticky left-0 z-10 bg-white px-4 py-3 border-r border-slate-300 ${definition.color}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${definition.color.replace('text-', 'bg-').split(' ')[0]}`}></div>
                    <span className="font-medium text-sm">{definition.display_label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      definition.store_id
                        ? 'bg-blue-100 text-blue-700'
                        : definition.concept_id
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {definition.store_id ? 'Store' : definition.concept_id ? 'Concept' : 'Global'}
                    </span>
                  </div>
                </td>
                {DAYS_OF_WEEK.map(day => {
                  const schedule = getScheduleForCell(definition.id, day.value);
                  const modified = isModified(definition.id, day.value);
                  const isEditing = editingCell?.definitionId === definition.id && editingCell?.day === day.value;

                  return (
                    <td
                      key={day.value}
                      className={`border-r border-slate-200 ${
                        isEditing
                          ? 'bg-blue-50 p-0'
                          : 'cursor-pointer hover:bg-slate-100 transition-colors'
                      }`}
                      onClick={() => !isEditing && handleCellClick(definition.id, day.value)}
                    >
                      {isEditing ? (
                        <div className="p-2 space-y-1" onKeyDown={handleKeyDown}>
                          <input
                            ref={startTimeRef}
                            type="time"
                            value={editValues.start_time}
                            onChange={(e) => setEditValues({ ...editValues, start_time: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="time"
                            value={editValues.end_time}
                            onChange={(e) => setEditValues({ ...editValues, end_time: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave();
                              }}
                              className="flex-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel();
                              }}
                              className="flex-1 px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`px-3 py-2 text-center ${
                          modified
                            ? 'bg-amber-50 border-l-2 border-amber-400'
                            : schedule
                            ? 'bg-green-50'
                            : 'bg-slate-50'
                        }`}>
                          {schedule ? (
                            <>
                              <div className="text-xs font-medium text-slate-900">
                                {schedule.start_time}
                              </div>
                              <div className="text-xs text-slate-600">to</div>
                              <div className="text-xs font-medium text-slate-900">
                                {schedule.end_time}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400">
                              <Edit2 className="w-3 h-3 mx-auto mb-1" />
                              Click to set
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
