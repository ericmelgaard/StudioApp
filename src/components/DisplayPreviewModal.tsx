import React, { useState } from 'react';
import { X, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface DisplayPreviewModalProps {
  displayName: string;
  previewUrl: string;
  onClose: () => void;
  orientation?: 'horizontal' | 'vertical';
}

export default function DisplayPreviewModal({ displayName, previewUrl, onClose, orientation = 'horizontal' }: DisplayPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full'
            : orientation === 'vertical'
            ? 'w-full max-w-3xl h-[90vh]'
            : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live Preview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              ) : (
                <Maximize2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-50 dark:bg-slate-900">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Loading preview...
              </p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
                This may take a moment to initialize
              </p>
            </div>
          )}
          <iframe
            key={iframeKey}
            src={previewUrl}
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
            title={`Preview: ${displayName}`}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}
