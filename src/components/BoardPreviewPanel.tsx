import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Maximize2, Image as ImageIcon } from 'lucide-react';
import type { PlaylistAsset, DisplayType } from '../types/themeBuilder';
import type { Asset } from '../types/assets';
import { assetService } from '../lib/assetService';

interface BoardPreviewPanelProps {
  selectedPlaylistAsset: PlaylistAsset | null;
  playlistAssets: PlaylistAsset[];
  assetDetails: Map<string, Asset>;
  displayType: DisplayType | null;
  previewMode: boolean;
  onTogglePreviewMode: () => void;
}

export function BoardPreviewPanel({
  selectedPlaylistAsset,
  playlistAssets,
  assetDetails,
  displayType,
  previewMode,
  onTogglePreviewMode
}: BoardPreviewPanelProps) {
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentAsset = selectedPlaylistAsset || playlistAssets[currentAssetIndex];
  const assetDetail = currentAsset ? assetDetails.get(currentAsset.asset_id) : null;

  useEffect(() => {
    if (!selectedPlaylistAsset && playlistAssets.length > 0) {
      setCurrentAssetIndex(0);
    }
  }, [playlistAssets, selectedPlaylistAsset]);

  useEffect(() => {
    if (isPlaying && currentAsset && !selectedPlaylistAsset) {
      setTimeRemaining(currentAsset.duration_seconds);

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            nextAsset();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPlaying, currentAsset, selectedPlaylistAsset]);

  const nextAsset = () => {
    if (playlistAssets.length === 0) return;
    setCurrentAssetIndex((prev) => (prev + 1) % playlistAssets.length);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const getAspectRatio = () => {
    if (!displayType?.specifications?.aspect_ratio) return '16:9';
    return displayType.specifications.aspect_ratio;
  };

  const getAspectRatioClass = () => {
    const ratio = getAspectRatio();
    switch (ratio) {
      case '16:9':
        return 'aspect-[16/9]';
      case '4:3':
        return 'aspect-[4/3]';
      case '21:9':
        return 'aspect-[21/9]';
      default:
        return 'aspect-[16/9]';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        {assetDetail ? (
          <div className="relative w-full max-w-6xl">
            <div className={`${getAspectRatioClass()} w-full bg-black rounded-lg overflow-hidden shadow-2xl`}>
              {assetDetail.asset_type === 'image' && (
                <img
                  src={assetService.getPublicUrl(assetDetail.storage_path)}
                  alt={assetDetail.title}
                  className="w-full h-full object-contain"
                />
              )}

              {assetDetail.asset_type === 'video' && (
                <video
                  src={assetService.getPublicUrl(assetDetail.storage_path)}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}

              {isPlaying && !selectedPlaylistAsset && (
                <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 rounded-lg p-3">
                  <div className="flex items-center justify-between text-white text-sm mb-2">
                    <span>Asset {currentAssetIndex + 1} of {playlistAssets.length}</span>
                    <span>{formatTime(timeRemaining)}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{
                        width: `${((currentAsset.duration_seconds - timeRemaining) / currentAsset.duration_seconds) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {displayType && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                  <span className="text-slate-700">{displayType.name}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600">
                    {displayType.specifications?.resolution || 'N/A'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600">{getAspectRatio()}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-16 h-16 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-slate-700 mb-2">No Asset Selected</h3>
            <p className="text-slate-500">Add assets to the playlist to preview</p>
          </div>
        )}
      </div>

      {playlistAssets.length > 0 && (
        <div className="border-t border-slate-200 p-4 bg-white">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayback}
              disabled={selectedPlaylistAsset !== null}
              className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-full transition-colors text-white"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>

            {!selectedPlaylistAsset && (
              <div className="text-sm text-slate-600">
                {isPlaying ? 'Playing' : 'Paused'} • Asset {currentAssetIndex + 1} of {playlistAssets.length}
              </div>
            )}

            {selectedPlaylistAsset && (
              <div className="text-sm text-slate-600">
                Viewing selected asset
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
