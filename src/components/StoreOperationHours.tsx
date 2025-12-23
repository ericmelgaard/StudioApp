import { useState, useEffect } from 'react';
import { Calendar, Save, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OperationHour {
  id: string;
  store_id: number;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface StoreOperationHoursProps {
  storeId: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

export default function StoreOperationHours({ storeId }: StoreOperationHoursProps) {
  const [hours, setHours] = useState<OperationHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadHours();
  }, [storeId]);

  const loadHours = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('store_operation_hours')
        .select('*')
        .eq('store_id', storeId)
        .order('day_of_week');

      if (fetchError) throw fetchError;

      const hoursMap = new Map(data?.map(h => [h.day_of_week, h]) || []);

      const allHours = DAYS_OF_WEEK.map(day => {
        const existing = hoursMap.get(day.value);
        return existing || {
          id: `temp-${day.value}`,
          store_id: storeId,
          day_of_week: day.value,
          open_time: '09:00',
          close_time: '17:00',
          is_closed: false
        };
      });

      setHours(allHours);
    } catch (err: any) {
      console.error('Error loading operation hours:', err);
      setError(err.message || 'Failed to load operation hours');
    } finally {
      setLoading(false);
    }
  };

  const updateHour = (dayOfWeek: number, field: keyof OperationHour, value: any) => {
    setHours(prev => prev.map(h =>
      h.day_of_week === dayOfWeek
        ? { ...h, [field]: value }
        : h
    ));
    setHasChanges(true);
  };

  const toggleClosed = (dayOfWeek: number) => {
    setHours(prev => prev.map(h =>
      h.day_of_week === dayOfWeek
        ? { ...h, is_closed: !h.is_closed }
        : h
    ));
    setHasChanges(true);
  };

  const copyToAll = (sourceDay: number) => {
    const sourceHour = hours.find(h => h.day_of_week === sourceDay);
    if (!sourceHour) return;

    setHours(prev => prev.map(h => ({
      ...h,
      open_time: sourceHour.open_time,
      close_time: sourceHour.close_time,
      is_closed: sourceHour.is_closed
    })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const upsertData = hours.map(h => ({
        store_id: storeId,
        day_of_week: h.day_of_week,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
        is_closed: h.is_closed
      }));

      const { error: upsertError } = await supabase
        .from('store_operation_hours')
        .upsert(upsertData, {
          onConflict: 'store_id,day_of_week',
          ignoreDuplicates: false
        });

      if (upsertError) throw upsertError;

      setSuccess('Operation hours saved successfully');
      setHasChanges(false);
      setTimeout(() => setSuccess(null), 3000);

      await loadHours();
    } catch (err: any) {
      console.error('Error saving operation hours:', err);
      setError(err.message || 'Failed to save operation hours');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Store Operation Hours</h3>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-2">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="space-y-2">
        {hours.map((hour) => {
          const day = DAYS_OF_WEEK.find(d => d.value === hour.day_of_week);
          if (!day) return null;

          return (
            <div
              key={hour.day_of_week}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                hour.is_closed
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-28">
                <span className="font-medium text-slate-900">{day.label}</span>
              </div>

              <div className="flex-1 flex items-center gap-4">
                {hour.is_closed ? (
                  <span className="text-slate-500 italic">Closed</span>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Open:</label>
                      <input
                        type="time"
                        value={hour.open_time || '09:00'}
                        onChange={(e) => updateHour(hour.day_of_week, 'open_time', e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Close:</label>
                      <input
                        type="time"
                        value={hour.close_time || '17:00'}
                        onChange={(e) => updateHour(hour.day_of_week, 'close_time', e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleClosed(hour.day_of_week)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    hour.is_closed
                      ? 'bg-slate-600/20 text-slate-900 hover:bg-slate-600/30'
                      : 'bg-green-600/20 text-green-900 hover:bg-green-600/30'
                  }`}
                >
                  {hour.is_closed ? 'Closed' : 'Open'}
                </button>
                {!hour.is_closed && (
                  <button
                    type="button"
                    onClick={() => copyToAll(hour.day_of_week)}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    title="Copy these hours to all days"
                  >
                    Copy to All
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={loadHours}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 font-medium"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Hours
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
