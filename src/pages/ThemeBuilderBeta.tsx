import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Play, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { themeBuilderService } from '../lib/themeBuilderService';
import { AssetLibraryModal } from '../components/AssetLibraryModal';
import { BoardPlaylistPanel } from '../components/BoardPlaylistPanel';
import { BoardPreviewPanel } from '../components/BoardPreviewPanel';
import { BoardSettingsPanel } from '../components/BoardSettingsPanel';
import type { Theme, DisplayType, DaypartDefinition, ThemeContent, PlaylistAsset } from '../types/themeBuilder';
import type { Asset } from '../types/assets';

interface ThemeBuilderBetaProps {
  themeId: string;
  themeName: string;
  onBack: () => void;
}

interface DaypartConfig {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
}

export default function ThemeBuilderBeta({ themeId, themeName, onBack }: ThemeBuilderBetaProps) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [dayparts, setDayparts] = useState<DaypartConfig[]>([]);
  const [selectedDisplayType, setSelectedDisplayType] = useState<DisplayType | null>(null);
  const [selectedDaypart, setSelectedDaypart] = useState<string>('');
  const [themeContent, setThemeContent] = useState<ThemeContent | null>(null);
  const [playlistAssets, setPlaylistAssets] = useState<PlaylistAsset[]>([]);
  const [assetDetails, setAssetDetails] = useState<Map<string, Asset>>(new Map());
  const [selectedPlaylistAsset, setSelectedPlaylistAsset] = useState<PlaylistAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [themeId]);

  useEffect(() => {
    if (theme && selectedDisplayType) {
      loadThemeContent();
    }
  }, [theme, selectedDisplayType]);

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
    setSchemaError(null);
    try {
      const { data: themeData, error: themeError } = await supabase
        .from('themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (themeError) throw themeError;
      if (!themeData) {
        setSchemaError('Theme not found');
        return;
      }

      setTheme(themeData as Theme);

      if (!themeData.display_type_ids || themeData.display_type_ids.length === 0) {
        setSchemaError('Theme has no display types configured. Please edit the theme to configure its schema.');
        return;
      }

      if (!themeData.daypart_ids || themeData.daypart_ids.length === 0) {
        setSchemaError('Theme has no dayparts configured. Please edit the theme to configure its schema.');
        return;
      }

      const [displayTypesResult, daypartsResult] = await Promise.all([
        supabase
          .from('display_types')
          .select('*')
          .in('id', themeData.display_type_ids)
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('daypart_definitions')
          .select('id, daypart_name, display_label, color')
          .in('id', themeData.daypart_ids)
          .eq('is_active', true)
          .order('sort_order')
      ]);

      if (displayTypesResult.error) throw displayTypesResult.error;
      if (daypartsResult.error) throw daypartsResult.error;

      const loadedDisplayTypes = displayTypesResult.data || [];
      const loadedDayparts = daypartsResult.data || [];

      if (loadedDisplayTypes.length === 0) {
        setSchemaError('No active display types found for this theme');
        return;
      }

      if (loadedDayparts.length === 0) {
        setSchemaError('No active dayparts found for this theme');
        return;
      }

      setDisplayTypes(loadedDisplayTypes);
      setDayparts(loadedDayparts);
      setSelectedDisplayType(loadedDisplayTypes[0]);
      setSelectedDaypart(loadedDayparts[0].id);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setSchemaError('Failed to load theme data');
    } finally {
      setLoading(false);
    }
  };

  const loadThemeContent = async () => {
    if (!theme || !selectedDisplayType) return;

    try {
      let content = await themeBuilderService.getThemeContent(
        theme.id,
        selectedDisplayType.id
      );

      if (!content) {
        content = await themeBuilderService.createThemeContent(
          theme.id,
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

  if (schemaError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-amber-300 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Schema Configuration Required</h2>
            <p className="text-slate-600 mb-6">{schemaError}</p>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Themes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="h-8 w-px bg-slate-300" />

          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">{themeName}</h1>
          </div>

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
            {dayparts.map(daypart => (
              <button
                key={daypart.id}
                onClick={() => setSelectedDaypart(daypart.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedDaypart === daypart.id
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                style={{
                  backgroundColor: selectedDaypart === daypart.id ? daypart.color : undefined
                }}
              >
                {daypart.display_label}
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
