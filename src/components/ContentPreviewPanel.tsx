import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Image as ImageIcon, Video, Layout } from 'lucide-react';
import type { BoardContent } from '../types/themeBuilder';
import type { Asset } from '../types/assets';

interface ContentPreviewPanelProps {
  selectedContent: BoardContent | null;
  selectedAsset: Asset | null;
  allContent: BoardContent[];
  onSelectContent: (contentId: string) => void;
}

export function ContentPreviewPanel({
  selectedContent,
  selectedAsset,
  allContent,
  onSelectContent
}: ContentPreviewPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [selectedContent?.id]);

  useEffect(() => {
    if (!isPlaying || !selectedContent) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const duration = selectedContent.duration_seconds;
        if (duration === 0) return prev + 1;
        if (prev >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, selectedContent]);

  const handlePrevious = () => {
    if (!selectedContent) return;
    const sortedContent = [...allContent].sort((a, b) => a.order_position - b.order_position);
    const currentIndex = sortedContent.findIndex(c => c.id === selectedContent.id);
    if (currentIndex > 0) {
      onSelectContent(sortedContent[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (!selectedContent) return;
    const sortedContent = [...allContent].sort((a, b) => a.order_position - b.order_position);
    const currentIndex = sortedContent.findIndex(c => c.id === selectedContent.id);
    if (currentIndex < sortedContent.length - 1) {
      onSelectContent(sortedContent[currentIndex + 1].id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPreviewContent = () => {
    if (!selectedContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Layout className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-slate-700 mb-2">No Content Selected</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Select content from the left panel to preview it here
          </p>
        </div>
      );
    }

    if (selectedContent.content_type === 'template') {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
              {selectedContent.config_data?.template_name || 'Template Content'}
            </h3>
            <p className="text-slate-600 text-center mb-6">
              Template preview will be rendered here
            </p>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Type:</span>
                  <span className="ml-2 font-medium text-slate-900">Template</span>
                </div>
                <div>
                  <span className="text-slate-500">Duration:</span>
                  <span className="ml-2 font-medium text-slate-900">
                    {selectedContent.duration_seconds === 0 ? 'Infinite' : `${selectedContent.duration_seconds}s`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedAsset) {
      const assetUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${selectedAsset.storage_path}`;

      if (selectedAsset.asset_type === 'video') {
        return (
          <div className="flex items-center justify-center h-full bg-slate-900 p-8">
            <video
              key={selectedContent.id}
              src={assetUrl}
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              controls={false}
              autoPlay={isPlaying}
              loop={selectedContent.duration_seconds === 0}
            />
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center h-full bg-slate-900 p-8">
          <img
            src={assetUrl}
            alt={selectedAsset.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
          <ImageIcon className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-medium text-slate-700 mb-2">Asset Not Found</h3>
        <p className="text-sm text-slate-500">
          The asset for this content could not be loaded
        </p>
      </div>
    );
  };

  const sortedContent = [...allContent].sort((a, b) => a.order_position - b.order_position);
  const currentIndex = selectedContent ? sortedContent.findIndex(c => c.id === selectedContent.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < sortedContent.length - 1;

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      <div className="flex-1 relative">
        {getPreviewContent()}

        {selectedContent && (
          <div className="absolute top-4 right-4">
            <button
              className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg backdrop-blur-sm transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        )}
      </div>

      {selectedContent && (
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack className="w-5 h-5 text-slate-700" />
              </button>

              <button
                onClick={() => {
                  if (isPlaying) {
                    setIsPlaying(false);
                  } else {
                    setCurrentTime(0);
                    setIsPlaying(true);
                  }
                }}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={handleNext}
                disabled={!hasNext}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="w-5 h-5 text-slate-700" />
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 min-w-[3rem]">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: selectedContent.duration_seconds === 0
                          ? '0%'
                          : `${Math.min((currentTime / selectedContent.duration_seconds) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 min-w-[3rem]">
                    {selectedContent.duration_seconds === 0 ? '∞' : formatTime(selectedContent.duration_seconds)}
                  </span>
                </div>
              </div>

              <div className="text-sm text-slate-600">
                <span className="font-medium">
                  {currentIndex + 1} / {sortedContent.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span>
                  <span className="font-medium">Position:</span> #{selectedContent.order_position}
                </span>
                <span>
                  <span className="font-medium">Transition:</span> {selectedContent.transition_effect}
                </span>
                {selectedContent.start_date && (
                  <span>
                    <span className="font-medium">Start:</span> {selectedContent.start_date}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
