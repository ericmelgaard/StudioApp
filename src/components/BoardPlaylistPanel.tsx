import { useState } from 'react';
import { Plus, GripVertical, Trash2, Image as ImageIcon, Video, FileText } from 'lucide-react';
import type { PlaylistAsset } from '../types/themeBuilder';
import type { Asset } from '../types/assets';

interface BoardPlaylistPanelProps {
  playlistAssets: PlaylistAsset[];
  assetDetails: Map<string, Asset>;
  selectedPlaylistAsset: PlaylistAsset | null;
  onSelectAsset: (asset: PlaylistAsset | null) => void;
  onAddAssets: () => void;
  onRemoveAsset: (playlistAssetId: string) => void;
  onReorderAssets: (reorderedAssets: PlaylistAsset[]) => void;
}

export function BoardPlaylistPanel({
  playlistAssets,
  assetDetails,
  selectedPlaylistAsset,
  onSelectAsset,
  onAddAssets,
  onRemoveAsset,
  onReorderAssets
}: BoardPlaylistPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newAssets = [...playlistAssets];
    const draggedAsset = newAssets[draggedIndex];
    newAssets.splice(draggedIndex, 1);
    newAssets.splice(index, 0, draggedAsset);

    setDraggedIndex(index);
    onReorderAssets(newAssets);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAssetIcon = (asset: Asset) => {
    switch (asset.asset_type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Playlist</h2>
          <button
            onClick={onAddAssets}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Assets
          </button>
        </div>
        <div className="text-sm text-slate-600">
          {playlistAssets.length} {playlistAssets.length === 1 ? 'asset' : 'assets'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {playlistAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No assets yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Add images or videos to build your board
            </p>
            <button
              onClick={onAddAssets}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Assets
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {playlistAssets
              .sort((a, b) => a.order_position - b.order_position)
              .map((playlistAsset, index) => {
                const asset = assetDetails.get(playlistAsset.asset_id);
                const isSelected = selectedPlaylistAsset?.id === playlistAsset.id;

                return (
                  <div
                    key={playlistAsset.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectAsset(playlistAsset)}
                    className={`group relative flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    <div className="cursor-grab active:cursor-grabbing">
                      <GripVertical className={`w-4 h-4 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                    </div>

                    {asset && (
                      <>
                        <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                          {asset.preview_path ? (
                            <img
                              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/assets/${asset.preview_path}`}
                              alt={asset.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              {getAssetIcon(asset)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                              #{playlistAsset.order_position}
                            </span>
                            <h3 className="text-sm font-medium truncate">{asset.title}</h3>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                            {getAssetIcon(asset)}
                            <span>{formatDuration(playlistAsset.duration_seconds)}</span>
                            {playlistAsset.transition_effect !== 'none' && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{playlistAsset.transition_effect}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAsset(playlistAsset.id);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-600 rounded transition-all ${isSelected ? 'hover:text-white' : ''}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
