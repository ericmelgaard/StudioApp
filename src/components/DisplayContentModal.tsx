import React, { useState, useEffect } from 'react';
import { X, Save, Link2, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Display {
  id: string;
  name: string;
  configuration?: {
    preview_url?: string;
    screenshot_url?: string;
    is_temporary_content?: boolean;
    content_notes?: string;
  };
}

interface DisplayContentModalProps {
  display: Display;
  onClose: () => void;
  onSave: () => void;
}

export default function DisplayContentModal({ display, onClose, onSave }: DisplayContentModalProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [contentNotes, setContentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (display.configuration) {
      setPreviewUrl(display.configuration.preview_url || '');
      setScreenshotUrl(display.configuration.screenshot_url || '');
      setContentNotes(display.configuration.content_notes || '');
    }
  }, [display]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const configuration = {
        ...display.configuration,
        preview_url: previewUrl.trim() || null,
        screenshot_url: screenshotUrl.trim() || null,
        is_temporary_content: !!(previewUrl.trim() || screenshotUrl.trim()),
        content_notes: contentNotes.trim() || null,
        assigned_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('displays')
        .update({
          configuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', display.id);

      if (updateError) throw updateError;

      onSave();
      onClose();
    } catch (err) {
      console.error('Error updating display content:', err);
      setError(err instanceof Error ? err.message : 'Failed to update display content');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all temporary content for this display?')) return;

    setLoading(true);
    setError(null);

    try {
      const configuration = {
        ...display.configuration,
        preview_url: null,
        screenshot_url: null,
        is_temporary_content: false,
        content_notes: null,
        assigned_at: null,
      };

      const { error: updateError } = await supabase
        .from('displays')
        .update({
          configuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', display.id);

      if (updateError) throw updateError;

      onSave();
      onClose();
    } catch (err) {
      console.error('Error clearing display content:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear display content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Assign Temporary Content
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {display.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Link2 className="w-4 h-4" />
              Live Preview URL
            </label>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="https://trm.wandcorp.com/cms_mediafiles/preview/..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Full URL including all query parameters (currentTime, workingPath, scheduleUrl, etc.)
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <ImageIcon className="w-4 h-4" />
              Screenshot URL
            </label>
            <input
              type="url"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              placeholder="https://[project].supabase.co/storage/v1/object/public/DQ/..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              URL to static screenshot stored in Supabase storage (DQ folder)
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <FileText className="w-4 h-4" />
              Notes
            </label>
            <textarea
              value={contentNotes}
              onChange={(e) => setContentNotes(e.target.value)}
              placeholder="e.g., Drive Thru - Burgers display for Dairy Queen Lab"
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 resize-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Optional description of the temporary content assignment
            </p>
          </div>

          {display.configuration?.is_temporary_content && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This display currently has temporary content assigned.
              </p>
            </div>
          )}
        </form>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleClear}
            disabled={loading || !display.configuration?.is_temporary_content}
            className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Clear Content
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
