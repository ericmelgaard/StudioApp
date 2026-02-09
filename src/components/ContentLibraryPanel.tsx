import { useState } from 'react';
import { Plus, Image as ImageIcon, Video, Layout, GripVertical, Calendar, Clock, Trash2 } from 'lucide-react';
import type { BoardContent } from '../types/themeBuilder';
import type { Asset } from '../types/assets';

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
    <div className="bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">Content</h2>
        <button
          onClick={onAddContent}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sortedContent.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Layout className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">No Content Yet</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add images, videos, or templates to this board
            </p>
            <button
              onClick={onAddContent}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Content
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
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
                    group relative p-3 rounded-lg border cursor-pointer transition-all
                    ${isSelected
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                    ${isDragging ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`${isSelected ? 'text-blue-600' : 'text-slate-600'}`}>
                          {getContentIcon(item)}
                        </div>
                        <h3 className="text-sm font-medium text-slate-900 truncate">
                          {getContentTitle(item)}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-mono">#{item.order_position}</span>
                        <span>•</span>
                        <span>{getContentSubtitle(item)}</span>
                      </div>

                      {(item.start_date || item.start_time || (item.days_of_week && item.days_of_week.length > 0)) && (
                        <div className="flex items-center gap-2 text-xs">
                          {(item.start_date || item.end_date) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              <Calendar className="w-3 h-3" />
                              Dated
                            </span>
                          )}
                          {(item.start_time || item.end_time) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              <Clock className="w-3 h-3" />
                              Timed
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
                      className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-600">
          <div className="flex justify-between mb-1">
            <span>Total Content:</span>
            <span className="font-medium">{content.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Duration:</span>
            <span className="font-medium">
              {content.reduce((sum, item) => sum + (item.duration_seconds === 0 ? 0 : item.duration_seconds), 0)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
