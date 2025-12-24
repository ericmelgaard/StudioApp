import { useState } from 'react';
import { Calendar, Clock, X, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StagedChange {
  id?: string;
  change_type: 'create' | 'update' | 'delete';
  target_table: string;
  target_id?: string;
  change_data: any;
  notes?: string;
}

interface PublishScheduleModalProps {
  stagedChanges: StagedChange[];
  locationId: number | null;
  onClose: () => void;
  onPublished: () => void;
}

export default function PublishScheduleModal({
  stagedChanges,
  locationId,
  onClose,
  onPublished,
}: PublishScheduleModalProps) {
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('00:00');
  const [notes, setNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);

    try {
      let publishDateTime: string;

      if (publishImmediately) {
        publishDateTime = new Date().toISOString();
      } else {
        if (!publishDate || !publishTime) {
          setError('Please select a date and time for scheduled publishing');
          setPublishing(false);
          return;
        }
        publishDateTime = new Date(`${publishDate}T${publishTime}`).toISOString();
      }

      const changesToInsert = stagedChanges.map(change => ({
        change_type: change.change_type,
        target_table: change.target_table,
        target_id: change.target_id || null,
        change_data: change.change_data,
        publish_date: publishDateTime,
        publish_immediately: publishImmediately,
        status: 'pending',
        notes: notes || null,
        location_id: locationId,
      }));

      const { error: insertError } = await supabase
        .from('daypart_staged_changes')
        .insert(changesToInsert);

      if (insertError) throw insertError;

      if (publishImmediately) {
        const { error: publishError } = await supabase.rpc('publish_due_daypart_changes');
        if (publishError) throw publishError;
      }

      onPublished();
    } catch (err: any) {
      console.error('Error publishing changes:', err);
      setError(err.message || 'Failed to publish changes');
      setPublishing(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Save className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Publish Changes</h3>
          </div>
          <button
            onClick={onClose}
            disabled={publishing}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  {stagedChanges.length} Change{stagedChanges.length !== 1 ? 's' : ''} Ready to Publish
                </h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>
                    <strong>{stagedChanges.filter(c => c.change_type === 'create').length}</strong> new schedules
                  </div>
                  <div>
                    <strong>{stagedChanges.filter(c => c.change_type === 'update').length}</strong> updated schedules
                  </div>
                  <div>
                    <strong>{stagedChanges.filter(c => c.change_type === 'delete').length}</strong> deleted schedules
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Publishing Options</h4>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={publishImmediately}
                  onChange={() => setPublishImmediately(true)}
                  disabled={publishing}
                  className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-slate-900">Publish Immediately</div>
                  <p className="text-sm text-slate-600">
                    Changes will be applied right away and take effect immediately
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!publishImmediately}
                  onChange={() => setPublishImmediately(false)}
                  disabled={publishing}
                  className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 mb-2">Schedule for Later</div>
                  <p className="text-sm text-slate-600 mb-3">
                    Changes will be automatically published at the specified date and time
                  </p>

                  {!publishImmediately && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="date"
                            value={publishDate}
                            onChange={(e) => setPublishDate(e.target.value)}
                            min={minDate}
                            disabled={publishing}
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Time
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="time"
                            value={publishTime}
                            onChange={(e) => setPublishTime(e.target.value)}
                            disabled={publishing}
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={publishing}
              placeholder="Add notes about these changes for future reference..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-slate-100"
            />
          </div>

          {!publishImmediately && publishDate && publishTime && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Scheduled for:</strong> {new Date(`${publishDate}T${publishTime}`).toLocaleString()}
                  <p className="mt-1">
                    Changes will be automatically published at this time. You can cancel or modify the schedule before it goes live.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={publishing}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || (!publishImmediately && (!publishDate || !publishTime))}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {publishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {publishImmediately ? 'Publish Now' : 'Schedule Changes'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
