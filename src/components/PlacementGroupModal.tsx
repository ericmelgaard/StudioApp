import { useState, useEffect, FormEvent } from 'react';
import { X, AlertCircle, Clock, Utensils, Palette, Nfc, MapPin, Phone, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlacementGroup {
  id?: string;
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  store_id?: number | null;
  is_store_root?: boolean;
  daypart_hours?: Record<string, any>;
  meal_stations?: string[];
  templates?: Record<string, any>;
  nfc_url?: string | null;
  address?: string | null;
  timezone?: string;
  phone?: string | null;
  operating_hours?: Record<string, any>;
}

interface PlacementGroupModalProps {
  group: PlacementGroup | null;
  availableParents: PlacementGroup[];
  storeId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYPART_TYPES = ['breakfast', 'lunch', 'dinner', 'late_night', 'dark_hours'];
const DEVICE_SIZES = ['4.2"', '5"', '7"'];

export default function PlacementGroupModal({ group, availableParents, storeId, onClose, onSuccess }: PlacementGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    parent_id: group?.parent_id || '',
    nfc_url: group?.nfc_url || '',
    address: group?.address || '',
    timezone: group?.timezone || 'America/New_York',
    phone: group?.phone || '',
  });

  const [daypartHours, setDaypartHours] = useState<Record<string, { start: string; end: string }>>(
    group?.daypart_hours || {}
  );

  const [mealStations, setMealStations] = useState<string[]>(
    group?.meal_stations || []
  );

  const [templates, setTemplates] = useState<Record<string, string>>(
    group?.templates || {}
  );

  const [operatingHours, setOperatingHours] = useState<Record<string, { open: string; close: string }>>(
    group?.operating_hours || {}
  );

  const [newMealStation, setNewMealStation] = useState('');

  const isStoreRoot = group?.is_store_root || false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        parent_id: formData.parent_id || null,
        daypart_hours: daypartHours,
        meal_stations: mealStations,
        templates: templates,
        nfc_url: formData.nfc_url || null,
        ...(!group?.id && storeId && { store_id: storeId }), // Set store_id for new placements
        ...(isStoreRoot && {
          address: formData.address || null,
          timezone: formData.timezone || 'America/New_York',
          phone: formData.phone || null,
          operating_hours: operatingHours,
        }),
      };

      if (group?.id) {
        if (group.name === '36355 - WAND Digital Demo' && data.name !== '36355 - WAND Digital Demo') {
          setError('Cannot rename the default store placement group');
          setLoading(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('placement_groups')
          .update(data)
          .eq('id', group.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('placement_groups')
          .insert([data]);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save placement group');
    } finally {
      setLoading(false);
    }
  };

  const handleDaypartChange = (daypart: string, field: 'start' | 'end', value: string) => {
    setDaypartHours(prev => ({
      ...prev,
      [daypart]: {
        ...(prev[daypart] || { start: '', end: '' }),
        [field]: value,
      },
    }));
  };

  const removeDaypart = (daypart: string) => {
    setDaypartHours(prev => {
      const newHours = { ...prev };
      delete newHours[daypart];
      return newHours;
    });
  };

  const addMealStation = () => {
    if (newMealStation.trim() && !mealStations.includes(newMealStation.trim())) {
      setMealStations([...mealStations, newMealStation.trim()]);
      setNewMealStation('');
    }
  };

  const removeMealStation = (station: string) => {
    setMealStations(mealStations.filter(s => s !== station));
  };

  const handleTemplateChange = (size: string, templateId: string) => {
    setTemplates(prev => ({
      ...prev,
      [size]: templateId,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {group?.id ? 'Edit Placement Group' : 'Create Placement Group'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="e.g., Main Dining Area"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          {!isStoreRoot && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Parent Group
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">None (Root Level)</option>
                {availableParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isStoreRoot && (
            <>
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Store Location</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="America/Phoenix">Arizona Time</option>
                        <option value="America/Anchorage">Alaska Time</option>
                        <option value="Pacific/Honolulu">Hawaii Time</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Operating Hours</h3>
                </div>
                <div className="space-y-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} className="grid grid-cols-3 gap-3 items-center">
                      <label className="text-sm font-medium text-slate-700">{day}</label>
                      <input
                        type="time"
                        value={operatingHours[day]?.open || ''}
                        onChange={(e) => setOperatingHours({
                          ...operatingHours,
                          [day]: { ...operatingHours[day], open: e.target.value, close: operatingHours[day]?.close || '' }
                        })}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                        placeholder="Open"
                      />
                      <input
                        type="time"
                        value={operatingHours[day]?.close || ''}
                        onChange={(e) => setOperatingHours({
                          ...operatingHours,
                          [day]: { ...operatingHours[day], open: operatingHours[day]?.open || '', close: e.target.value }
                        })}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                        placeholder="Close"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">Daypart Hours</h3>
            </div>
            <div className="space-y-3">
              {DAYPART_TYPES.map(daypart => (
                <div key={daypart} className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 capitalize">
                        {daypart.replace('_', ' ')} Start
                      </label>
                      <input
                        type="time"
                        value={daypartHours[daypart]?.start || ''}
                        onChange={(e) => handleDaypartChange(daypart, 'start', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 capitalize">
                        {daypart.replace('_', ' ')} End
                      </label>
                      <input
                        type="time"
                        value={daypartHours[daypart]?.end || ''}
                        onChange={(e) => handleDaypartChange(daypart, 'end', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  {daypartHours[daypart] && (
                    <button
                      type="button"
                      onClick={() => removeDaypart(daypart)}
                      className="mt-5 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">Meal Stations</h3>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newMealStation}
                onChange={(e) => setNewMealStation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMealStation())}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Add meal station (e.g., Grill, Salad Bar)"
              />
              <button
                type="button"
                onClick={addMealStation}
                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
              >
                Add
              </button>
            </div>
            {mealStations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mealStations.map(station => (
                  <div
                    key={station}
                    className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-sm"
                  >
                    <span className="text-amber-900">{station}</span>
                    <button
                      type="button"
                      onClick={() => removeMealStation(station)}
                      className="text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">Templates by Device Size</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Assign templates for different device sizes. Templates will be defined later.
            </p>
            <div className="space-y-3">
              {DEVICE_SIZES.map(size => (
                <div key={size}>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    {size} Template
                  </label>
                  <input
                    type="text"
                    value={templates[size] || ''}
                    onChange={(e) => handleTemplateChange(size, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    placeholder={`Template ID for ${size} devices`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Nfc className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">NFC URL</h3>
            </div>
            <input
              type="url"
              value={formData.nfc_url}
              onChange={(e) => setFormData({ ...formData, nfc_url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="https://example.com/menu"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                group?.id ? 'Update Group' : 'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
