import { X, Trash2, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface DaypartDefinition {
  id: string;
  name: string;
}

interface DaypartSchedule {
  id: string;
  definition_id: string;
}

interface StagedChange {
  id?: string;
  change_type: 'create' | 'update' | 'delete';
  target_table: string;
  target_id?: string;
  change_data: any;
  notes?: string;
}

interface ChangesStagingPanelProps {
  stagedChanges: StagedChange[];
  definitions: DaypartDefinition[];
  schedules: DaypartSchedule[];
  onRemoveChange: (index: number) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ChangesStagingPanel({
  stagedChanges,
  definitions,
  schedules,
  onRemoveChange,
  onClearAll,
  onClose,
}: ChangesStagingPanelProps) {
  const getDefinitionName = (definitionId: string) => {
    return definitions.find(d => d.id === definitionId)?.name || 'Unknown';
  };

  const getScheduleDefinitionId = (scheduleId: string) => {
    return schedules.find(s => s.id === scheduleId)?.definition_id;
  };

  const renderChange = (change: StagedChange, index: number) => {
    const isScheduleChange = change.target_table === 'daypart_schedules';
    const isOverrideChange = change.target_table === 'placement_daypart_overrides';

    let title = '';
    let description = '';
    let icon = null;

    if (isScheduleChange) {
      const definitionId = change.change_data.definition_id ||
        (change.target_id && getScheduleDefinitionId(change.target_id));
      const definitionName = definitionId ? getDefinitionName(definitionId) : 'Unknown';

      if (change.change_type === 'create') {
        title = `New Schedule: ${definitionName}`;
        icon = <CheckCircle className="w-4 h-4 text-green-600" />;
      } else if (change.change_type === 'update') {
        title = `Update Schedule: ${definitionName}`;
        icon = <Clock className="w-4 h-4 text-blue-600" />;
      } else if (change.change_type === 'delete') {
        title = `Delete Schedule: ${definitionName}`;
        icon = <X className="w-4 h-4 text-red-600" />;
      }

      if (change.change_data.start_time && change.change_data.end_time) {
        description = `${change.change_data.start_time} - ${change.change_data.end_time}`;
      }

      if (change.change_data.days_of_week && Array.isArray(change.change_data.days_of_week)) {
        const days = change.change_data.days_of_week.map((d: number) => DAYS_OF_WEEK[d]).join(', ');
        description += description ? ` (${days})` : days;
      }
    } else if (isOverrideChange) {
      if (change.change_type === 'create') {
        title = 'New Placement Override';
        icon = <CheckCircle className="w-4 h-4 text-purple-600" />;
      } else if (change.change_type === 'update') {
        title = 'Update Placement Override';
        icon = <Clock className="w-4 h-4 text-purple-600" />;
      } else if (change.change_type === 'delete') {
        title = 'Remove Placement Override';
        icon = <X className="w-4 h-4 text-red-600" />;
      }
      description = 'Placement-specific schedule';
    }

    return (
      <div
        key={index}
        className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {icon}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {title}
              </div>
              {description && (
                <div className="text-xs text-slate-600 mt-0.5">
                  {description}
                </div>
              )}
              <div className="mt-1 flex items-center gap-1">
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                  change.change_type === 'create'
                    ? 'bg-green-100 text-green-700'
                    : change.change_type === 'update'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {change.change_type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onRemoveChange(index)}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            title="Remove change"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const createCount = stagedChanges.filter(c => c.change_type === 'create').length;
  const updateCount = stagedChanges.filter(c => c.change_type === 'update').length;
  const deleteCount = stagedChanges.filter(c => c.change_type === 'delete').length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-lg h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Pending Changes</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {createCount > 0 && (
            <span className="flex items-center gap-1 text-green-700">
              <CheckCircle className="w-3 h-3" />
              {createCount} new
            </span>
          )}
          {updateCount > 0 && (
            <span className="flex items-center gap-1 text-blue-700">
              <Clock className="w-3 h-3" />
              {updateCount} modified
            </span>
          )}
          {deleteCount > 0 && (
            <span className="flex items-center gap-1 text-red-700">
              <X className="w-3 h-3" />
              {deleteCount} deleted
            </span>
          )}
        </div>

        {stagedChanges.length > 0 && (
          <button
            onClick={onClearAll}
            className="mt-3 w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Clear All Changes
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {stagedChanges.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No pending changes</p>
            <p className="text-xs text-slate-500 mt-1">
              Edit schedules in the grid to stage changes
            </p>
          </div>
        ) : (
          stagedChanges.map((change, index) => renderChange(change, index))
        )}
      </div>

      {stagedChanges.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-600 mb-2">
            Review your changes above, then click Publish Changes to apply them.
          </div>
        </div>
      )}
    </div>
  );
}
