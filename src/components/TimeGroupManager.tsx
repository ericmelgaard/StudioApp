import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface TimeGroup {
  id?: string;
  days: number[];
  startTime: string;
  endTime: string;
}

interface TimeGroupManagerProps {
  defaultStartTime: string;
  defaultEndTime: string;
  existingGroups: TimeGroup[];
  onSave: (groups: TimeGroup[]) => void;
  onCancel: () => void;
  color?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
  { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' }
];

const PRESETS = {
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
  allDays: [0, 1, 2, 3, 4, 5, 6]
};

function getGroupLabel(days: number[]): string {
  const sorted = [...days].sort();

  if (sorted.length === 0) return 'No days selected';
  if (sorted.length === 7) return 'All Days';

  const isWeekdays = sorted.length === 5 &&
    sorted.every(d => PRESETS.weekdays.includes(d));
  if (isWeekdays) return 'Weekdays (Mon-Fri)';

  const isWeekend = sorted.length === 2 &&
    sorted.every(d => PRESETS.weekend.includes(d));
  if (isWeekend) return 'Weekend (Sat-Sun)';

  if (sorted.length === 1) {
    return DAYS_OF_WEEK.find(d => d.value === sorted[0])?.label || '';
  }

  return sorted.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ');
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

interface TimeGroupCardProps {
  group: TimeGroup;
  onEdit: () => void;
  onDelete: () => void;
  color?: string;
}

function TimeGroupCard({ group, onEdit, onDelete, color }: TimeGroupCardProps) {
  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <div>
            <h4 className="font-semibold text-slate-900">{getGroupLabel(group.days)}</h4>
            <p className="text-sm text-slate-600 mt-0.5">
              {formatTime(group.startTime)} - {formatTime(group.endTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit time group"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete time group"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {DAYS_OF_WEEK.map((day) => {
          const isActive = group.days.includes(day.value);
          return (
            <div
              key={day.value}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
              title={day.label}
            >
              {day.letter}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TimeGroupFormProps {
  group: TimeGroup;
  onUpdate: (group: TimeGroup) => void;
  onSave: () => void;
  onCancel: () => void;
  usedDays: number[];
}

function TimeGroupForm({ group, onUpdate, onSave, onCancel, usedDays }: TimeGroupFormProps) {
  const toggleDay = (day: number) => {
    const newDays = group.days.includes(day)
      ? group.days.filter(d => d !== day)
      : [...group.days, day].sort();
    onUpdate({ ...group, days: newDays });
  };

  const applyPreset = (preset: number[]) => {
    onUpdate({ ...group, days: [...preset] });
  };

  const isDayUsed = (day: number) => {
    return !group.days.includes(day) && usedDays.includes(day);
  };

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Days for This Time Group
        </label>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => applyPreset(PRESETS.weekdays)}
            className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Weekdays (M-F)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(PRESETS.weekend)}
            className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Weekend (S-S)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(PRESETS.allDays)}
            className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            All Days
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ ...group, days: [] })}
            className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="flex justify-center gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = group.days.includes(day.value);
            const isUsed = isDayUsed(day.value);

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                disabled={isUsed}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isUsed
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
                title={isUsed ? `${day.label} is already in another group` : day.label}
              >
                {day.letter}
              </button>
            );
          })}
        </div>

        <div className="mt-2 text-xs text-slate-600">
          {group.days.length} {group.days.length === 1 ? 'day' : 'days'} selected
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Start Time
          </label>
          <input
            type="time"
            value={group.startTime}
            onChange={(e) => onUpdate({ ...group, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            End Time
          </label>
          <input
            type="time"
            value={group.endTime}
            onChange={(e) => onUpdate({ ...group, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={group.days.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          Save Time Group
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TimeGroupManager({
  defaultStartTime,
  defaultEndTime,
  existingGroups,
  onSave,
  onCancel,
  color
}: TimeGroupManagerProps) {
  const [groups, setGroups] = useState<TimeGroup[]>(existingGroups);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newGroup, setNewGroup] = useState<TimeGroup>({
    days: [],
    startTime: defaultStartTime,
    endTime: defaultEndTime
  });

  useEffect(() => {
    if (existingGroups.length === 0 && groups.length === 0) {
      setIsAdding(true);
    }
  }, []);

  const getUsedDays = (excludeIndex?: number): number[] => {
    return groups
      .filter((_, i) => i !== excludeIndex)
      .flatMap(g => g.days);
  };

  const handleAddGroup = () => {
    setNewGroup({
      days: [],
      startTime: defaultStartTime,
      endTime: defaultEndTime
    });
    setIsAdding(true);
    setEditingIndex(null);
  };

  const handleSaveNewGroup = () => {
    if (newGroup.days.length > 0) {
      setGroups([...groups, newGroup]);
      setIsAdding(false);
      setNewGroup({
        days: [],
        startTime: defaultStartTime,
        endTime: defaultEndTime
      });
    }
  };

  const handleCancelNew = () => {
    setIsAdding(false);
    setNewGroup({
      days: [],
      startTime: defaultStartTime,
      endTime: defaultEndTime
    });
  };

  const handleEditGroup = (index: number) => {
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleUpdateGroup = (index: number, updatedGroup: TimeGroup) => {
    const newGroups = [...groups];
    newGroups[index] = updatedGroup;
    setGroups(newGroups);
  };

  const handleSaveEdit = () => {
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleDeleteGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const handleSaveAll = () => {
    onSave(groups);
  };

  return (
    <div className="px-6 py-4 bg-white border-t border-slate-200">
      <div className="space-y-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Time Groups</h4>
            <p className="text-xs text-slate-600">
              Create time groups by selecting multiple days that share the same hours.
            </p>
          </div>
          {!isAdding && editingIndex === null && (
            <button
              onClick={handleAddGroup}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Time Group
            </button>
          )}
        </div>

        {groups.length === 0 && !isAdding ? (
          <div className="text-center py-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">No time groups configured</h3>
            <p className="text-xs text-slate-600 mb-4">
              All days will use the default times shown above
            </p>
            <button
              onClick={handleAddGroup}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Time Group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, index) => (
              editingIndex === index ? (
                <TimeGroupForm
                  key={index}
                  group={group}
                  onUpdate={(updatedGroup) => handleUpdateGroup(index, updatedGroup)}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  usedDays={getUsedDays(index)}
                />
              ) : (
                <TimeGroupCard
                  key={index}
                  group={group}
                  onEdit={() => handleEditGroup(index)}
                  onDelete={() => handleDeleteGroup(index)}
                  color={color}
                />
              )
            ))}

            {isAdding && (
              <TimeGroupForm
                group={newGroup}
                onUpdate={setNewGroup}
                onSave={handleSaveNewGroup}
                onCancel={handleCancelNew}
                usedDays={getUsedDays()}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200">
        <button
          onClick={handleSaveAll}
          disabled={isAdding || editingIndex !== null}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Save className="w-4 h-4" />
          Save All Changes
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
