import { useEffect, useRef } from 'react';
import { Layout, ChevronUp, ChevronDown } from 'lucide-react';
import type { BoardContent } from '../types/themeBuilder';
import type { Asset } from '../types/assets';
import { ContentItemWrapper } from './ContentItemWrapper';

interface ContentPreviewPanelProps {
  selectedContent: BoardContent | null;
  selectedAsset: Asset | null;
  allContent: BoardContent[];
  allAssets: Map<string, Asset>;
  onSelectContent: (contentId: string) => void;
}

export function ContentPreviewPanel({
  selectedContent,
  selectedAsset,
  allContent,
  allAssets,
  onSelectContent
}: ContentPreviewPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to selected content when selection changes
  useEffect(() => {
    if (!selectedContent || !scrollContainerRef.current) return;

    const contentElement = contentRefs.current.get(selectedContent.id);
    if (contentElement) {
      contentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedContent?.id]);

  const sortedContent = [...allContent].sort((a, b) => a.order_position - b.order_position);
  const currentIndex = selectedContent ? sortedContent.findIndex(c => c.id === selectedContent.id) : -1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onSelectContent(sortedContent[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < sortedContent.length - 1) {
      onSelectContent(sortedContent[currentIndex + 1].id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handlePrevious();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleNext();
    }
  };

  if (allContent.length === 0) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-slate-700 mb-2">No Content Yet</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Add content from the left panel to start building your board
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-slate-50 relative"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6 space-y-6 min-h-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        {sortedContent.map((content) => {
          const asset = content.asset_id ? allAssets.get(content.asset_id) || null : null;
          const isSelected = selectedContent?.id === content.id;

          return (
            <div
              key={content.id}
              ref={(el) => {
                if (el) {
                  contentRefs.current.set(content.id, el);
                } else {
                  contentRefs.current.delete(content.id);
                }
              }}
            >
              <ContentItemWrapper
                content={content}
                asset={asset}
                isSelected={isSelected}
                onClick={() => onSelectContent(content.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      {selectedContent && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg backdrop-blur-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110"
            title="Previous (↑)"
          >
            <ChevronUp className="w-5 h-5 text-slate-700" />
          </button>

          <div className="px-3 py-2 bg-white/90 rounded-lg shadow-lg backdrop-blur-sm text-xs font-medium text-slate-700 text-center">
            {currentIndex + 1}/{sortedContent.length}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === sortedContent.length - 1}
            className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg backdrop-blur-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110"
            title="Next (↓)"
          >
            <ChevronDown className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      )}

      {/* Scroll Position Indicator */}
      {sortedContent.length > 1 && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1 bg-slate-200 rounded-full overflow-hidden" style={{ height: '40%' }}>
          <div
            className="w-full bg-blue-600 rounded-full transition-all duration-300"
            style={{
              height: `${(1 / sortedContent.length) * 100}%`,
              transform: `translateY(${(currentIndex / (sortedContent.length - 1 || 1)) * (sortedContent.length - 1) * 100}%)`
            }}
          />
        </div>
      )}
    </div>
  );
}
