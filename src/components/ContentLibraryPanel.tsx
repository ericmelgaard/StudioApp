import { useState } from 'react';
import { Plus, Image as ImageIcon, Video, Layout, GripVertical, Calendar, Clock, Trash2 } from 'lucide-react';
import type { BoardContent } from '../types/themeBuilder';
import type { Asset } from '../types/assets';
import { assetService } from '../lib/assetService';

interface ContentLibraryPanelProps {
  boardId: string;
  content: BoardContent[];
  assets: Map<string, Asset>;
  selectedContentId: string | null;
  onSelectContent: (contentId: string) => void;
  onAddContent: () => void;
  onReorderContent: (contentId: string, newPosition: number) => void;
  onDeleteContent: (contentId: string) => void;
}

export function ContentLibraryPanel({
  boardId,
  content,
  assets,
  selectedContentId,
  onSelectContent,
  onAddContent,
  onReorderContent,
  onDeleteContent
}: ContentLibraryPanelProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const getContentIcon = (item: BoardContent) => {
    if (item.content_type === 'template') {
      return <Layout className="w-4 h-4" />;
    }

    const asset = item.asset_id ? assets.get(item.asset_id) : null;
    if (asset?.asset_type === 'video') {
      return <Video className="w-4 h-4" />;
    }

    return <ImageIcon className="w-4 h-4" />;
  };

  const getContentTitle = (item: BoardContent) => {
    if (item.content_type === 'template') {
      return item.config_data?.template_name || 'Template Content';
    }

    const asset = item.asset_id ? assets.get(item.asset_id) : null;
    return asset?.title || 'Untitled Content';
  };

  const getContentSubtitle = (item: BoardContent) => {
    const parts: string[] = [];

    if (item.duration_seconds === 0) {
      parts.push('Infinite');
    } else {
      parts.push(`${item.duration_seconds}s`);
    }

    if (item.start_date || item.end_date) {
      parts.push('Scheduled');
    }

    if (item.days_of_week && item.days_of_week.length > 0 && item.days_of_week.length < 7) {
      parts.push(`${item.days_of_week.length} days`);
    }

    return parts.join(' • ');
  };

  const getThumbnail = (item: BoardContent) => {
    const asset = item.asset_id ? assets.get(item.asset_id) : null;

    if (asset) {
      const thumbnailUrl = asset.preview_path
        ? assetService.getPublicUrl(asset.preview_path)
        : assetService.getPublicUrl(asset.storage_path);

      return (
        <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-slate-100">
          <img
            src={thumbnailUrl}
            alt={asset.title}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // Template or missing asset - show icon
    return (
      <div className="w-12 h-12 flex-shrink-0 rounded bg-slate-100 flex items-center justify-center">
        {getContentIcon(item)}
      </div>
    );
  };

  const handleDragStart = (e: React.DragEvent, contentId: string) => {
    setDraggedItem(contentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetContentId: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetContentId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = content.findIndex(c => c.id === draggedItem);
    const targetIndex = content.findIndex(c => c.id === targetContentId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      onReorderContent(draggedItem, targetIndex + 1);
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const sortedContent = [...content].sort((a, b) => a.order_position - b.order_position);

  return (
    <div className="h-full bg-white border-r border-slate-200 flex flex-col">
      <div className="p-3 border-b border-slate-200 flex flex-col gap-2 flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-900">Content</h2>
        <button
          onClick={onAddContent}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {sortedContent.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Layout className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-xs font-medium text-slate-700 mb-1">No Content</h3>
            <p className="text-xs text-slate-500 mb-3">
              Add content to start building
            </p>
            <button
              onClick={onAddContent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {sortedContent.map((item) => {
              const isSelected = item.id === selectedContentId;
              const isDragging = item.id === draggedItem;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectContent(item.id)}
                  className={`
                    group relative p-2 rounded-lg border cursor-pointer transition-all
                    ${isSelected
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-100'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                    ${isDragging ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-3 h-3 text-slate-400" />
                    </div>

                    {getThumbnail(item)}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-medium text-slate-900 truncate mb-0.5">
                        {getContentTitle(item)}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <span className="font-mono text-xs">#{item.order_position}</span>
                        <span>•</span>
                        <span className="text-xs">{getContentSubtitle(item)}</span>
                      </div>

                      {(item.start_date || item.start_time || (item.days_of_week && item.days_of_week.length > 0)) && (
                        <div className="flex items-center gap-1 text-xs flex-wrap">
                          {(item.start_date || item.end_date) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                              <Calendar className="w-2.5 h-2.5" />
                              Date
                            </span>
                          )}
                          {(item.start_time || item.end_time) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                              <Clock className="w-2.5 h-2.5" />
                              Time
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Remove this content from the board?')) {
                          onDeleteContent(item.id);
                        }
                      }}
                      className="flex-shrink-0 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-600 space-y-0.5">
          <div className="flex justify-between">
            <span>Items:</span>
            <span className="font-medium">{content.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-medium">
              {content.reduce((sum, item) => sum + (item.duration_seconds === 0 ? 0 : item.duration_seconds), 0)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
