import { useState } from 'react';
import { Edit, Eye, Trash2, Copy, Settings } from 'lucide-react';
import type { BoardContent } from '../types/themeBuilder';
import type { Asset } from '../types/assets';
import { assetService } from '../lib/assetService';

interface ContentItemWrapperProps {
  content: BoardContent;
  asset: Asset | null;
  isSelected: boolean;
  onClick: () => void;
}

export function ContentItemWrapper({
  content,
  asset,
  isSelected,
  onClick
}: ContentItemWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  const renderContent = () => {
    if (content.content_type === 'template') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-8">
          <div className="text-4xl font-bold text-white text-center mb-2">
            {content.config_data?.template_name || 'Template'}
          </div>
          <div className="text-slate-300 text-center">Template Preview</div>
        </div>
      );
    }

    if (asset) {
      const assetUrl = assetService.getPublicUrl(asset.storage_path);

      if (asset.asset_type === 'video') {
        return (
          <video
            src={assetUrl}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        );
      }

      return (
        <img
          src={assetUrl}
          alt={asset.title}
          className="w-full h-full object-cover"
        />
      );
    }

    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-center">
          <div className="text-sm font-medium">Asset Not Found</div>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-4' : 'ring-1 ring-slate-200'}
      `}
      style={{ aspectRatio: '16/9' }}
    >
      <div className="w-full h-full bg-black rounded-lg overflow-hidden">
        {renderContent()}
      </div>

      {(isHovered || isSelected) && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement edit design
            }}
            className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg backdrop-blur-sm transition-all hover:scale-105"
            title="Edit Design"
          >
            <Edit className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement preview
            }}
            className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg backdrop-blur-sm transition-all hover:scale-105"
            title="Preview"
          >
            <Eye className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement settings
            }}
            className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg backdrop-blur-sm transition-all hover:scale-105"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      )}

      {isSelected && (
        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {asset?.title || content.config_data?.template_name || 'Untitled'}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span>#{content.order_position}</span>
                <span>•</span>
                <span>{content.duration_seconds === 0 ? 'Infinite' : `${content.duration_seconds}s`}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
