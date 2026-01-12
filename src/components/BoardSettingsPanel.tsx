import { useState, useEffect } from 'react';
import { Settings, Clock, Zap, Calendar } from 'lucide-react';
import type { PlaylistAsset } from '../types/themeBuilder';
import type { Asset } from '../types/assets';

interface BoardSettingsPanelProps {
  selectedPlaylistAsset: PlaylistAsset | null;
  selectedAsset: Asset | null;
  onUpdateAsset: (playlistAssetId: string, updates: Partial<PlaylistAsset>) => void;
}

const TRANSITIONS = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'zoom', label: 'Zoom' }
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

export function BoardSettingsPanel({
  selectedPlaylistAsset,
  selectedAsset,
  onUpdateAsset
}: BoardSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<Partial<PlaylistAsset>>({});

  useEffect(() => {
    if (selectedPlaylistAsset) {
      setLocalSettings({
        duration_seconds: selectedPlaylistAsset.duration_seconds,
        transition_effect: selectedPlaylistAsset.transition_effect,
        start_date: selectedPlaylistAsset.start_date,
        end_date: selectedPlaylistAsset.end_date,
        start_time: selectedPlaylistAsset.start_time,
        end_time: selectedPlaylistAsset.end_time,
        days_of_week: selectedPlaylistAsset.days_of_week || []
      });
    }
  }, [selectedPlaylistAsset]);

  const handleUpdate = (updates: Partial<PlaylistAsset>) => {
    if (!selectedPlaylistAsset) return;
    setLocalSettings({ ...localSettings, ...updates });
    onUpdateAsset(selectedPlaylistAsset.id, updates);
  };

  const toggleDayOfWeek = (day: number) => {
    if (!selectedPlaylistAsset) return;
    const currentDays = localSettings.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    handleUpdate({ days_of_week: newDays });
  };

  if (!selectedPlaylistAsset || !selectedAsset) {
    return (
      <div className="bg-slate-800 border-l border-slate-700 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Asset Selected</h3>
          <p className="text-sm text-slate-500">
            Select an asset from the playlist to edit its settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border-l border-slate-700 overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Asset Settings
        </h2>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Asset Info</h3>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-slate-500 mb-1">Title</div>
              <div className="text-sm text-slate-300">{selectedAsset.title}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Type</div>
              <div className="text-sm text-slate-300 capitalize">{selectedAsset.asset_type}</div>
            </div>
            {selectedAsset.description && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Description</div>
                <div className="text-sm text-slate-300">{selectedAsset.description}</div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Playback Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={localSettings.duration_seconds || 10}
                onChange={(e) => handleUpdate({ duration_seconds: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Transition Effect
              </label>
              <select
                value={localSettings.transition_effect || 'fade'}
                onChange={(e) => handleUpdate({ transition_effect: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TRANSITIONS.map(transition => (
                  <option key={transition.value} value={transition.value}>
                    {transition.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Start Date (optional)
              </label>
              <input
                type="date"
                value={localSettings.start_date || ''}
                onChange={(e) => handleUpdate({ start_date: e.target.value || null })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                End Date (optional)
              </label>
              <input
                type="date"
                value={localSettings.end_date || ''}
                onChange={(e) => handleUpdate({ end_date: e.target.value || null })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Start Time (optional)
              </label>
              <input
                type="time"
                value={localSettings.start_time || ''}
                onChange={(e) => handleUpdate({ start_time: e.target.value || null })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                End Time (optional)
              </label>
              <input
                type="time"
                value={localSettings.end_time || ''}
                onChange={(e) => handleUpdate({ end_time: e.target.value || null })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Days of Week
              </label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    onClick={() => toggleDayOfWeek(day.value)}
                    className={`px-2 py-2 rounded text-xs font-medium transition-colors ${
                      (localSettings.days_of_week || []).includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {(localSettings.days_of_week || []).length === 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  No days selected = runs every day
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
            <h4 className="text-xs font-medium text-slate-400 mb-2">Quick Info</h4>
            <div className="space-y-1 text-xs text-slate-500">
              <div>Position: #{selectedPlaylistAsset.order_position}</div>
              <div>Duration: {localSettings.duration_seconds}s</div>
              <div>Transition: {localSettings.transition_effect || 'fade'}</div>
              {(localSettings.days_of_week || []).length > 0 && (
                <div>Scheduled: {(localSettings.days_of_week || []).length} days</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
