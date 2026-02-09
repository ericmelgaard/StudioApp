import { useState } from 'react';
import { X, Layers, Share2, Upload as UploadIcon, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AssetLibraryTab } from './ContentSource/AssetLibraryTab';
import { SharedContentTab } from './ContentSource/SharedContentTab';
import { UploadTab } from './ContentSource/UploadTab';
import { DesignTab } from './ContentSource/DesignTab';

interface AddContentModalProps {
  boardId: string;
  onClose: () => void;
  onContentAdded: () => void;
  companyId?: number | null;
  conceptId?: number | null;
  storeId?: number | null;
}

type ContentSource = 'asset_library' | 'shared_library' | 'upload' | 'design_tool';

export function AddContentModal({
  boardId,
  onClose,
  onContentAdded,
  companyId,
  conceptId,
  storeId
}: AddContentModalProps) {
  const [selectedSource, setSelectedSource] = useState<ContentSource>('asset_library');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedSharedContentId, setSelectedSharedContentId] = useState<string | null>(null);

  const handleAddContent = async () => {
    if (!selectedAssetId && !selectedSharedContentId) return;

    try {
      const { data: existingContent } = await supabase
        .from('board_content')
        .select('order_position')
        .eq('board_id', boardId)
        .order('order_position', { ascending: false })
        .limit(1);

      const nextPosition = existingContent && existingContent.length > 0
        ? existingContent[0].order_position + 1
        : 1;

      const contentData: any = {
        board_id: boardId,
        content_type: 'asset',
        content_source: selectedSource,
        order_position: nextPosition,
        duration_seconds: 10,
        transition_effect: 'fade',
        status: 'active'
      };

      if (selectedSource === 'asset_library' || selectedSource === 'upload') {
        contentData.asset_id = selectedAssetId;
      } else if (selectedSource === 'shared_library') {
        contentData.shared_content_id = selectedSharedContentId;
      }

      const { error } = await supabase
        .from('board_content')
        .insert(contentData);

      if (error) throw error;

      onContentAdded();
      onClose();
    } catch (error) {
      console.error('Error adding content:', error);
      alert('Failed to add content. Please try again.');
    }
  };

  const sourceTabs = [
    {
      id: 'asset_library' as ContentSource,
      label: 'Asset Library',
      icon: Layers,
      description: 'From your organization'
    },
    {
      id: 'shared_library' as ContentSource,
      label: 'Shared Content',
      icon: Share2,
      description: 'Curated collections'
    },
    {
      id: 'upload' as ContentSource,
      label: 'Upload',
      icon: UploadIcon,
      description: 'From your computer'
    },
    {
      id: 'design_tool' as ContentSource,
      label: 'Design',
      icon: Palette,
      description: 'Create or import'
    }
  ];

  const canAddContent = () => {
    if (selectedSource === 'asset_library' || selectedSource === 'upload') {
      return selectedAssetId !== null;
    } else if (selectedSource === 'shared_library') {
      return selectedSharedContentId !== null;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Add Content to Board</h2>
            <p className="text-sm text-slate-600 mt-1">
              Choose from multiple sources to add content to your display board
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200">
          <div className="grid grid-cols-4 gap-3">
            {sourceTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedSource(tab.id);
                    setSelectedAssetId(null);
                    setSelectedSharedContentId(null);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedSource === tab.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${
                    selectedSource === tab.id ? 'text-blue-600' : 'text-slate-400'
                  }`} />
                  <div className={`text-sm font-semibold mb-0.5 ${
                    selectedSource === tab.id ? 'text-blue-900' : 'text-slate-900'
                  }`}>
                    {tab.label}
                  </div>
                  <div className={`text-xs ${
                    selectedSource === tab.id ? 'text-blue-700' : 'text-slate-500'
                  }`}>
                    {tab.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          {selectedSource === 'asset_library' && (
            <AssetLibraryTab
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
              companyId={companyId}
              conceptId={conceptId}
              storeId={storeId}
            />
          )}

          {selectedSource === 'shared_library' && (
            <SharedContentTab
              selectedContentId={selectedSharedContentId}
              onSelectContent={setSelectedSharedContentId}
            />
          )}

          {selectedSource === 'upload' && (
            <UploadTab
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
              companyId={companyId}
              conceptId={conceptId}
              storeId={storeId}
            />
          )}

          {selectedSource === 'design_tool' && (
            <DesignTab
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
            />
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAddContent}
            disabled={!canAddContent()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add to Board
          </button>
        </div>
      </div>
    </div>
  );
}
