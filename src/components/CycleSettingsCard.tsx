import { useState, useEffect } from 'react';
import { Calendar, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CycleSettings {
  id?: string;
  concept_id: number;
  starting_week_date: string;
  cycle_duration_weeks: number;
  created_at?: string;
  updated_at?: string;
}

interface CycleSettingsCardProps {
  conceptId: number;
}

export default function CycleSettingsCard({ conceptId }: CycleSettingsCardProps) {
  const [settings, setSettings] = useState<CycleSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    starting_week_date: '',
    cycle_duration_weeks: 4
  });

  useEffect(() => {
    loadSettings();
  }, [conceptId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_cycle_settings')
      .select('*')
      .eq('concept_id', conceptId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading cycle settings:', error);
    } else if (data) {
      setSettings(data);
      setFormData({
        starting_week_date: data.starting_week_date,
        cycle_duration_weeks: data.cycle_duration_weeks
      });
    } else {
      setSettings(null);
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      setFormData({
        starting_week_date: monday.toISOString().split('T')[0],
        cycle_duration_weeks: 4
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('organization_cycle_settings')
          .update({
            starting_week_date: formData.starting_week_date,
            cycle_duration_weeks: formData.cycle_duration_weeks,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_cycle_settings')
          .insert({
            concept_id: conceptId,
            starting_week_date: formData.starting_week_date,
            cycle_duration_weeks: formData.cycle_duration_weeks
          });

        if (error) throw error;
      }

      await loadSettings();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving cycle settings:', error);
      alert(`Failed to save cycle settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        starting_week_date: settings.starting_week_date,
        cycle_duration_weeks: settings.cycle_duration_weeks
      });
    }
    setIsEditing(false);
  };

  const calculateCurrentWeek = () => {
    if (!settings) return null;

    const startDate = new Date(settings.starting_week_date);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const currentWeek = (diffWeeks % settings.cycle_duration_weeks) + 1;

    return currentWeek;
  };

  const calculateNextCycleStart = () => {
    if (!settings) return null;

    const startDate = new Date(settings.starting_week_date);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const weeksUntilNextCycle = settings.cycle_duration_weeks - (diffWeeks % settings.cycle_duration_weeks);

    const nextCycleStart = new Date(today);
    nextCycleStart.setDate(today.getDate() + (weeksUntilNextCycle * 7));

    return nextCycleStart.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Organization Cycle Settings</h3>
            <p className="text-sm text-slate-600">Configure weekly cycle timing for theme deployment</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            {settings ? 'Edit' : 'Configure'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Starting Week Date
            </label>
            <input
              type="date"
              value={formData.starting_week_date}
              onChange={(e) => setFormData({ ...formData, starting_week_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              The date when week 1 of your cycle begins (typically a Monday)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cycle Duration (weeks)
            </label>
            <input
              type="number"
              min="1"
              max="52"
              value={formData.cycle_duration_weeks}
              onChange={(e) => setFormData({ ...formData, cycle_duration_weeks: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Number of weeks in a complete cycle before it repeats
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : settings ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Starting Week</div>
            <div className="text-lg font-semibold text-slate-900">
              {new Date(settings.starting_week_date).toLocaleDateString()}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Cycle Duration</div>
            <div className="text-lg font-semibold text-slate-900">
              {settings.cycle_duration_weeks} weeks
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Current Week</div>
            <div className="text-lg font-semibold text-blue-900">
              Week {calculateCurrentWeek()} of {settings.cycle_duration_weeks}
            </div>
          </div>

          <div className="md:col-span-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xs text-green-600 uppercase tracking-wide mb-1">Next Cycle Starts</div>
            <div className="text-sm font-medium text-green-900">
              {calculateNextCycleStart()}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-slate-600 mb-4">
            No cycle settings configured. Click Configure to set up weekly cycle timing.
          </p>
        </div>
      )}
    </div>
  );
}
