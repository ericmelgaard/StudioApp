import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Play, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ContentLibraryPanel } from '../components/ContentLibraryPanel';
import { ContentPreviewPanel } from '../components/ContentPreviewPanel';
import { ContentSettingsPanel } from '../components/ContentSettingsPanel';
import { AddContentModal } from '../components/AddContentModal';
import type { Theme, DisplayType, DaypartDefinition, ThemeBoard, BoardContent } from '../types/themeBuilder';
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
  const [currentBoard, setCurrentBoard] = useState<ThemeBoard | null>(null);
  const [boardContent, setBoardContent] = useState<BoardContent[]>([]);
  const [assetDetails, setAssetDetails] = useState<Map<string, Asset>>(new Map());
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [themeId]);

  useEffect(() => {
    if (theme && selectedDisplayType && selectedDaypart) {
      loadBoardAndContent();
    }
  }, [theme, selectedDisplayType, selectedDaypart]);

  useEffect(() => {
    if (boardContent.length > 0) {
      loadAssetDetails();
    }
  }, [boardContent]);

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

      const { data: boardsData, error: boardsError } = await supabase
        .from('theme_boards')
        .select(`
          id,
          display_type_id,
          daypart_id,
          display_types:display_type_id (*),
          daypart_definitions:daypart_id (id, daypart_name, display_label, color)
        `)
        .eq('theme_id', themeId)
        .eq('status', 'active');

      if (boardsError) throw boardsError;

      if (!boardsData || boardsData.length === 0) {
        setSchemaError('Theme has no boards configured. Please edit the theme to add at least one board.');
        return;
      }

      const uniqueDisplayTypes: DisplayType[] = [];
      const uniqueDayparts: DaypartConfig[] = [];
      const displayTypeIds = new Set<string>();
      const daypartIds = new Set<string>();

      boardsData.forEach((board: any) => {
        if (board.display_types && !displayTypeIds.has(board.display_type_id)) {
          uniqueDisplayTypes.push(board.display_types);
          displayTypeIds.add(board.display_type_id);
        }
        if (board.daypart_definitions && !daypartIds.has(board.daypart_id)) {
          uniqueDayparts.push(board.daypart_definitions);
          daypartIds.add(board.daypart_id);
        }
      });

      if (uniqueDisplayTypes.length === 0) {
        setSchemaError('No valid display types found for this theme');
        return;
      }

      if (uniqueDayparts.length === 0) {
        setSchemaError('No valid dayparts found for this theme');
        return;
      }

      setDisplayTypes(uniqueDisplayTypes);
      setDayparts(uniqueDayparts);
      setSelectedDisplayType(uniqueDisplayTypes[0]);
      setSelectedDaypart(uniqueDayparts[0].id);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setSchemaError('Failed to load theme data');
    } finally {
      setLoading(false);
    }
  };

  const loadBoardAndContent = async () => {
    if (!theme || !selectedDisplayType || !selectedDaypart) return;

    try {
      const { data: boardData, error: boardError } = await supabase
        .from('theme_boards')
        .select('*')
        .eq('theme_id', theme.id)
        .eq('display_type_id', selectedDisplayType.id)
        .eq('daypart_id', selectedDaypart)
        .eq('status', 'active')
        .maybeSingle();

      if (boardError) throw boardError;

      if (!boardData) {
        const { data: newBoard, error: createError } = await supabase
          .from('theme_boards')
          .insert({
            theme_id: theme.id,
            display_type_id: selectedDisplayType.id,
            daypart_id: selectedDaypart,
            layout_config: { type: 'fullscreen', width: '100%', height: '100%' },
            status: 'active'
          })
          .select()
          .single();

        if (createError) throw createError;
        setCurrentBoard(newBoard as ThemeBoard);
        setBoardContent([]);
        setSelectedContentId(null);
        return;
      }

      setCurrentBoard(boardData as ThemeBoard);

      const { data: contentData, error: contentError } = await supabase
        .from('board_content')
        .select('*')
        .eq('board_id', boardData.id)
        .order('order_position', { ascending: true });

      if (contentError) throw contentError;

      setBoardContent(contentData || []);
      setSelectedContentId(null);
    } catch (error) {
      console.error('Error loading board and content:', error);
    }
  };

  const loadAssetDetails = async () => {
    const assetIds = boardContent
      .filter(c => c.asset_id)
      .map(c => c.asset_id as string);

    if (assetIds.length === 0) {
      setAssetDetails(new Map());
      return;
    }

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

  const handleContentAdded = async () => {
    await loadBoardAndContent();
    setShowAddContent(false);
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!currentBoard) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('board_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      await loadBoardAndContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContent = async (
    contentId: string,
    updates: Partial<BoardContent>
  ) => {
    if (!currentBoard) return;

    try {
      const { error } = await supabase
        .from('board_content')
        .update(updates)
        .eq('id', contentId);

      if (error) throw error;

      setBoardContent(prev =>
        prev.map(c => c.id === contentId ? { ...c, ...updates } : c)
      );
    } catch (error) {
      console.error('Error updating content:', error);
      alert('Failed to update content settings');
    }
  };

  const handleReorderContent = async (contentId: string, newPosition: number) => {
    if (!currentBoard) return;

    try {
      const reordered = [...boardContent];
      const itemIndex = reordered.findIndex(c => c.id === contentId);
      if (itemIndex === -1) return;

      const [item] = reordered.splice(itemIndex, 1);
      reordered.splice(newPosition - 1, 0, item);

      const updates = reordered.map((item, index) => ({
        id: item.id,
        order_position: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('board_content')
          .update({ order_position: update.order_position })
          .eq('id', update.id);
      }

      await loadBoardAndContent();
    } catch (error) {
      console.error('Error reordering content:', error);
      alert('Failed to reorder content');
    }
  };

  const getTotalDuration = () => {
    return boardContent.reduce((sum, item) => {
      if (item.duration_seconds === 0) return sum;
      return sum + item.duration_seconds;
    }, 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedContent = selectedContentId
    ? boardContent.find(c => c.id === selectedContentId) || null
    : null;

  const selectedAsset = selectedContent?.asset_id
    ? assetDetails.get(selectedContent.asset_id) || null
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-slate-50 min-h-[500px]">
        <div className="flex items-center gap-3 text-slate-900">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-lg">Loading Theme Builder...</span>
        </div>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="flex items-center justify-center bg-slate-50 min-h-[500px]">
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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
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
            {boardContent.length} items • {formatDuration(getTotalDuration())}
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[240px_1fr_280px] gap-0 overflow-hidden min-h-0">
        <ContentLibraryPanel
          boardId={currentBoard?.id || ''}
          content={boardContent}
          assets={assetDetails}
          selectedContentId={selectedContentId}
          onSelectContent={setSelectedContentId}
          onAddContent={() => setShowAddContent(true)}
          onReorderContent={handleReorderContent}
          onDeleteContent={handleDeleteContent}
        />

        <ContentPreviewPanel
          selectedContent={selectedContent}
          selectedAsset={selectedAsset}
          allContent={boardContent}
          allAssets={assetDetails}
          onSelectContent={setSelectedContentId}
        />

        <ContentSettingsPanel
          selectedContent={selectedContent}
          selectedAsset={selectedAsset}
          allContent={boardContent}
          onUpdateContent={handleUpdateContent}
          onDeleteContent={handleDeleteContent}
        />
      </div>

      {showAddContent && currentBoard && (
        <AddContentModal
          boardId={currentBoard.id}
          onClose={() => setShowAddContent(false)}
          onContentAdded={handleContentAdded}
          conceptId={theme?.concept_id || null}
        />
      )}
    </div>
  );
}
