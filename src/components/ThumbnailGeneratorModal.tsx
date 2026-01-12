import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { assetService } from '../lib/assetService';
import type { Asset } from '../types/assets';

interface ThumbnailGeneratorModalProps {
  asset: Asset;
  onClose: () => void;
  onGenerated: () => void;
}

export function ThumbnailGeneratorModal({ asset, onClose, onGenerated }: ThumbnailGeneratorModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [captureTime, setCaptureTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (asset.preview_path) {
      const cacheBuster = asset.updated_at ? new Date(asset.updated_at).getTime() : undefined;
      setPreviewUrl(assetService.getPublicUrl(asset.preview_path, cacheBuster));
    }
  }, [asset]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setVideoReady(true);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCaptureTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const captureFrame = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject(new Error('Video or canvas not available'));
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      if (video.readyState < 2) {
        reject(new Error('Video not ready. Please wait for it to load.'));
        return;
      }

      if (!video.videoWidth || !video.videoHeight) {
        reject(new Error('Video dimensions not available'));
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        reject(new Error('Failed to draw video frame: ' + (err as Error).message));
        return;
      }

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const handleGenerateThumbnail = async () => {
    setIsGenerating(true);
    try {
      if (asset.asset_type === 'video') {
        if (!videoRef.current) {
          throw new Error('Video not loaded');
        }

        if (videoRef.current.readyState < 2) {
          throw new Error('Please wait for the video to finish loading');
        }

        const frameBlob = await captureFrame();
        await assetService.generateThumbnail(asset.id, frameBlob);
      } else if (asset.asset_type === 'image') {
        await assetService.regenerateImageThumbnail(asset.id);
      }

      onGenerated();
      onClose();
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate thumbnail';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              {asset.preview_path ? 'Replace Thumbnail' : 'Generate Thumbnail'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Source Asset</h3>

              {asset.asset_type === 'video' ? (
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-lg overflow-hidden relative">
                    <video
                      ref={videoRef}
                      src={assetService.getPublicUrl(asset.storage_path)}
                      className="w-full"
                      onLoadedMetadata={handleVideoLoaded}
                      crossOrigin="anonymous"
                      controls
                      preload="metadata"
                    />
                    {!videoReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                        <div className="text-white text-sm">Loading video...</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Frame Time: {formatTime(captureTime)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      step="0.1"
                      value={captureTime}
                      onChange={handleTimeChange}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0:00</span>
                      <span>{formatTime(videoDuration)}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    Use the slider to scrub through the video and select the frame you want to use as the thumbnail.
                  </p>
                </div>
              ) : asset.asset_type === 'image' ? (
                <div className="space-y-4">
                  <img
                    src={assetService.getPublicUrl(asset.storage_path)}
                    alt={asset.title}
                    className="w-full rounded-lg"
                  />
                  <p className="text-sm text-gray-600">
                    This will generate a preview-sized version of the image for faster loading.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                {previewUrl ? 'Current Thumbnail' : 'Preview'}
              </h3>

              {previewUrl ? (
                <div className="space-y-4">
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="Current thumbnail"
                      className="w-full h-64 object-contain"
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Replace Existing Thumbnail</p>
                      <p className="text-yellow-700 mt-1">
                        Generating a new thumbnail will replace the current one.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    No thumbnail currently exists for this asset.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Generate one to improve loading performance.
                  </p>
                </div>
              )}

              <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 text-sm">About Thumbnails</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>Thumbnails are smaller versions for faster loading</li>
                  <li>Original assets remain unchanged</li>
                  <li>Maintains original aspect ratio</li>
                  {asset.asset_type === 'video' && (
                    <li>Select a representative frame for video content</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-white"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateThumbnail}
            disabled={isGenerating || (asset.asset_type === 'video' && !videoReady)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {isGenerating ? 'Generating...' : (previewUrl ? 'Replace Thumbnail' : 'Generate Thumbnail')}
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
