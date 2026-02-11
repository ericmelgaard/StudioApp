import { useState, useEffect } from 'react';
import { Settings, Clock, Calendar, Trash2, Info } from 'lucide-react';
import type { BoardContent } from '../types/themeBuilder';
import type { Asset } from '../types/assets';

interface ContentSettingsPanelProps {
  selectedContent: BoardContent | null;
  selectedAsset: Asset | null;
  allContent: BoardContent[];
  onUpdateContent: (contentId: string, updates: Partial<BoardContent>) => void;
  onDeleteContent: (contentId: string) => void;
}

const TRANSITIONS = [
  { value: 'none', label: 'Straight Cut' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'wipe', label: 'Wipe' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export function ContentSettingsPanel({
  selectedContent,
  selectedAsset,
  allContent,
  onUpdateContent,
  onDeleteContent
}: ContentSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<Partial<BoardContent>>({});

  useEffect(() => {
    if (selectedContent) {
      setLocalSettings({
        order_position: selectedContent.order_position,
        duration_seconds: selectedContent.duration_seconds,
        transition_effect: selectedContent.transition_effect,
        start_date: selectedContent.start_date,
        end_date: selectedContent.end_date,
        start_time: selectedContent.start_time,
        end_time: selectedContent.end_time,
        days_of_week: selectedContent.days_of_week || []
      });
    }
  }, [selectedContent?.id]);

  const handleUpdate = (updates: Partial<BoardContent>) => {
    if (!selectedContent) return;
    setLocalSettings({ ...localSettings, ...updates });
    onUpdateContent(selectedContent.id, updates);
  };

  const toggleDayOfWeek = (day: number) => {
    if (!selectedContent) return;
    const currentDays = localSettings.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    handleUpdate({ days_of_week: newDays });
  };

  const handleRemoveFromBoard = () => {
    if (!selectedContent) return;
    if (confirm('Remove this content from the board? This action cannot be undone.')) {
      onDeleteContent(selectedContent.id);
    }
  };

  if (!selectedContent) {
    return (
      <div className="h-full bg-white border-l border-slate-200 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Settings className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">No Selection</h3>
            <p className="text-xs text-slate-500">
              Select content to edit settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  const maxPosition = Math.max(...allContent.map(c => c.order_position), 1);

  return (
    <div className="h-full bg-white border-l border-slate-200 flex flex-col">
      <div className="p-3 border-b border-slate-200 flex-shrink-0">
        <h2 className="text-base font-semibold flex items-center gap-2 text-slate-900">
          <Settings className="w-4 h-4" />
          Settings
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 min-h-0">
        {selectedAsset && (
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-xs font-medium text-slate-700 mb-2">Content Info</h3>
            <div className="space-y-1.5">
              <div>
                <div className="text-xs text-slate-500">Title</div>
                <div className="text-xs text-slate-900 font-medium">{selectedAsset.title}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Type</div>
                <div className="text-xs text-slate-900 capitalize">{selectedAsset.asset_type}</div>
              </div>
              {selectedAsset.description && (
                <div>
                  <div className="text-xs text-slate-500">Description</div>
                  <div className="text-xs text-slate-600">{selectedAsset.description}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            ORDER
          </label>
          <select
            value={localSettings.order_position || 1}
            onChange={(e) => handleUpdate({ order_position: parseInt(e.target.value) })}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: maxPosition }, (_, i) => i + 1).map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            DURATION
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="3600"
              value={localSettings.duration_seconds ?? 10}
              onChange={(e) => handleUpdate({ duration_seconds: parseInt(e.target.value) || 0 })}
              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-xs text-slate-600 font-medium">sec</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">0 = infinite</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            TRANSITION
          </label>
          <select
            value={localSettings.transition_effect || 'fade'}
            onChange={(e) => handleUpdate({ transition_effect: e.target.value as any })}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TRANSITIONS.map(transition => (
              <option key={transition.value} value={transition.value}>
                {transition.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            START DATE
          </label>
          <input
            type="date"
            value={localSettings.start_date || ''}
            onChange={(e) => handleUpdate({ start_date: e.target.value || null })}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            END DATE <span className="text-slate-400 font-normal">(opt)</span>
          </label>
          <input
            type="date"
            value={localSettings.end_date || ''}
            onChange={(e) => handleUpdate({ end_date: e.target.value || null })}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            TIME RANGE <span className="text-slate-400 font-normal">(opt)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="time"
              value={localSettings.start_time || ''}
              onChange={(e) => handleUpdate({ start_time: e.target.value || null })}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="time"
              value={localSettings.end_time || ''}
              onChange={(e) => handleUpdate({ end_time: e.target.value || null })}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            DAYS
          </label>
          <div className="grid grid-cols-7 gap-0.5 mb-1.5">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                onClick={() => toggleDayOfWeek(day.value)}
                className={`px-1 py-1.5 rounded text-xs font-medium transition-colors ${
                  (localSettings.days_of_week || []).includes(day.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {(localSettings.days_of_week || []).length === 0 && (
            <div className="flex items-start gap-1.5 p-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>All days</span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={handleRemoveFromBoard}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors font-medium text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
