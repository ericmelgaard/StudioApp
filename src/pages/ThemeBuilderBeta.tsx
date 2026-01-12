import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Play, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { themeBuilderService } from '../lib/themeBuilderService';
import { AssetLibraryModal } from '../components/AssetLibraryModal';
import { BoardPlaylistPanel } from '../components/BoardPlaylistPanel';
import { BoardPreviewPanel } from '../components/BoardPreviewPanel';
import { BoardSettingsPanel } from '../components/BoardSettingsPanel';
import type { Theme, DisplayType, DaypartDefinition, ThemeContent, PlaylistAsset } from '../types/themeBuilder';
import type { Asset } from '../types/assets';

interface ThemeBuilderBetaProps {
  onBack: () => void;
}

const DAYPARTS = [
  { name: 'breakfast', label: 'Breakfast', color: 'bg-yellow-500' },
  { name: 'lunch', label: 'Lunch', color: 'bg-orange-500' },
  { name: 'dinner', label: 'Dinner', color: 'bg-red-500' },
  { name: 'late_night', label: 'Late Night', color: 'bg-purple-500' },
  { name: 'dark_hours', label: 'Dark Hours', color: 'bg-slate-700' }
];

export default function ThemeBuilderBeta({ onBack }: ThemeBuilderBetaProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedDisplayType, setSelectedDisplayType] = useState<DisplayType | null>(null);
  const [selectedDaypart, setSelectedDaypart] = useState<string>('breakfast');
  const [themeContent, setThemeContent] = useState<ThemeContent | null>(null);
  const [playlistAssets, setPlaylistAssets] = useState<PlaylistAsset[]>([]);
  const [assetDetails, setAssetDetails] = useState<Map<string, Asset>>(new Map());
  const [selectedPlaylistAsset, setSelectedPlaylistAsset] = useState<PlaylistAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTheme && selectedDisplayType) {
      loadThemeContent();
    }
  }, [selectedTheme, selectedDisplayType]);

  useEffect(() => {
    if (themeContent && selectedDaypart) {
      loadPlaylistForDaypart();
    }
  }, [themeContent, selectedDaypart]);

  useEffect(() => {
    if (playlistAssets.length > 0) {
      loadAssetDetails();
    }
  }, [playlistAssets]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [themesResult, displayTypesResult] = await Promise.all([
        supabase.from('themes').select('*').eq('status', 'active').order('name'),
        supabase.from('display_types').select('*').eq('status', 'active').order('name')
      ]);

      if (themesResult.data) setThemes(themesResult.data);
      if (displayTypesResult.data) setDisplayTypes(displayTypesResult.data);

      if (themesResult.data && themesResult.data.length > 0) {
        setSelectedTheme(themesResult.data[0]);
      }
      if (displayTypesResult.data && displayTypesResult.data.length > 0) {
        setSelectedDisplayType(displayTypesResult.data[0]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThemeContent = async () => {
    if (!selectedTheme || !selectedDisplayType) return;

    try {
      let content = await themeBuilderService.getThemeContent(
        selectedTheme.id,
        selectedDisplayType.id
      );

      if (!content) {
        content = await themeBuilderService.createThemeContent(
          selectedTheme.id,
          selectedDisplayType.id
        );
      }

      setThemeContent(content);
    } catch (error) {
      console.error('Error loading theme content:', error);
    }
  };

  const loadPlaylistForDaypart = async () => {
    if (!themeContent) return;

    try {
      const boardConfig = await themeBuilderService.getBoardConfiguration(
        themeContent.id,
        selectedDaypart
      );

      setPlaylistAssets(boardConfig?.playlist_assets || []);
      setSelectedPlaylistAsset(null);
    } catch (error) {
      console.error('Error loading playlist:', error);
    }
  };

  const loadAssetDetails = async () => {
    const assetIds = playlistAssets.map(pa => pa.asset_id);
    if (assetIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('asset_library')
        .select('*')
        .in('id', assetIds);

      if (error) throw error;

      const assetMap = new Map<string, Asset>();
      data?.forEach(asset => assetMap.set(asset.id, asset));
      setAssetDetails(assetMap);
    } catch (error) {
      console.error('Error loading asset details:', error);
    }
  };

  const handleAddAssets = async (assets: Asset[]) => {
    if (!themeContent) return;

    setSaving(true);
    try {
      for (const asset of assets) {
        await themeBuilderService.addAssetToPlaylist(
          themeContent.id,
          selectedDaypart,
          asset.id,
          asset.asset_type === 'video' ? 15 : 10
        );
      }
      await loadPlaylistForDaypart();
      setShowAssetLibrary(false);
    } catch (error) {
      console.error('Error adding assets:', error);
      alert('Failed to add assets to playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAsset = async (playlistAssetId: string) => {
    if (!themeContent) return;
    if (!confirm('Remove this asset from the playlist?')) return;

    setSaving(true);
    try {
      await themeBuilderService.removeAssetFromPlaylist(
        themeContent.id,
        selectedDaypart,
        playlistAssetId
      );
      await loadPlaylistForDaypart();
    } catch (error) {
      console.error('Error removing asset:', error);
      alert('Failed to remove asset');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlaylistAsset = async (
    playlistAssetId: string,
    updates: Partial<PlaylistAsset>
  ) => {
    if (!themeContent) return;

    try {
      await themeBuilderService.updatePlaylistAsset(
        themeContent.id,
        selectedDaypart,
        playlistAssetId,
        updates
      );
      await loadPlaylistForDaypart();
    } catch (error) {
      console.error('Error updating playlist asset:', error);
      alert('Failed to update asset settings');
    }
  };

  const handleReorderAssets = async (reorderedAssets: PlaylistAsset[]) => {
    if (!themeContent) return;

    try {
      await themeBuilderService.reorderPlaylistAssets(
        themeContent.id,
        selectedDaypart,
        reorderedAssets
      );
      setPlaylistAssets(reorderedAssets);
    } catch (error) {
      console.error('Error reordering assets:', error);
      alert('Failed to reorder assets');
    }
  };

  const getTotalDuration = () => {
    return playlistAssets.reduce((sum, asset) => sum + asset.duration_seconds, 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-900">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-lg">Loading Theme Builder...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedTheme?.id || ''}
            onChange={(e) => {
              const theme = themes.find(t => t.id === e.target.value);
              setSelectedTheme(theme || null);
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {themes.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>

          <select
            value={selectedDisplayType?.id || ''}
            onChange={(e) => {
              const displayType = displayTypes.find(dt => dt.id === e.target.value);
              setSelectedDisplayType(displayType || null);
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {displayTypes.map(dt => (
              <option key={dt.id} value={dt.id}>{dt.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-4">
            {DAYPARTS.map(daypart => (
              <button
                key={daypart.name}
                onClick={() => setSelectedDaypart(daypart.name)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedDaypart === daypart.name
                    ? `${daypart.color} text-white`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {daypart.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            {playlistAssets.length} assets • {formatDuration(getTotalDuration())}
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[320px_1fr_360px] gap-0 overflow-hidden">
        <BoardPlaylistPanel
          playlistAssets={playlistAssets}
          assetDetails={assetDetails}
          selectedPlaylistAsset={selectedPlaylistAsset}
          onSelectAsset={setSelectedPlaylistAsset}
          onAddAssets={() => setShowAssetLibrary(true)}
          onRemoveAsset={handleRemoveAsset}
          onReorderAssets={handleReorderAssets}
        />

        <BoardPreviewPanel
          selectedPlaylistAsset={selectedPlaylistAsset}
          playlistAssets={playlistAssets}
          assetDetails={assetDetails}
          displayType={selectedDisplayType}
          previewMode={previewMode}
          onTogglePreviewMode={() => setPreviewMode(!previewMode)}
        />

        <BoardSettingsPanel
          selectedPlaylistAsset={selectedPlaylistAsset}
          selectedAsset={selectedPlaylistAsset ? assetDetails.get(selectedPlaylistAsset.asset_id) : null}
          onUpdateAsset={handleUpdatePlaylistAsset}
        />
      </div>

      {showAssetLibrary && (
        <AssetLibraryModal
          onClose={() => setShowAssetLibrary(false)}
          onSelectAssets={handleAddAssets}
          multiSelect={true}
        />
      )}
    </div>
  );
}
