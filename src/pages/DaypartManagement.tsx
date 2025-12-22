import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string;
  color: string;
  default_start_time: string;
  default_end_time: string;
  default_days: number[];
  icon: string;
  sort_order: number;
  is_active: boolean;
  concept_id: number | null;
  created_at: string;
  updated_at: string;
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

const COLOR_OPTIONS = [
  { value: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Amber' },
  { value: 'bg-green-100 text-green-800 border-green-300', label: 'Green' },
  { value: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Blue' },
  { value: 'bg-violet-100 text-violet-800 border-violet-300', label: 'Violet' },
  { value: 'bg-slate-100 text-slate-800 border-slate-300', label: 'Slate' },
  { value: 'bg-red-100 text-red-800 border-red-300', label: 'Red' },
  { value: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Orange' },
  { value: 'bg-teal-100 text-teal-800 border-teal-300', label: 'Teal' },
];

export default function DaypartManagement() {
  const [dayparts, setDayparts] = useState<DaypartDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DaypartDefinition>>({
    daypart_name: '',
    display_label: '',
    description: '',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    default_start_time: '06:00:00',
    default_end_time: '11:00:00',
    default_days: [1, 2, 3, 4, 5, 6, 0],
    icon: 'Clock',
    sort_order: 0,
    is_active: true,
    concept_id: null
  });

  useEffect(() => {
    loadDayparts();
  }, []);

  const loadDayparts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('daypart_definitions')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error loading dayparts:', error);
      setError('Failed to load dayparts');
    } else {
      setDayparts(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.daypart_name || !formData.display_label) {
      setError('Daypart name and display label are required');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('daypart_definitions')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daypart_definitions')
          .insert([formData]);

        if (error) throw error;
      }

      setEditingId(null);
      setShowAddForm(false);
      setFormData({
        daypart_name: '',
        display_label: '',
        description: '',
        color: 'bg-slate-100 text-slate-800 border-slate-300',
        default_start_time: '06:00:00',
        default_end_time: '11:00:00',
        default_days: [1, 2, 3, 4, 5, 6, 0],
        icon: 'Clock',
        sort_order: 0,
        is_active: true,
        concept_id: null
      });
      setError(null);
      await loadDayparts();
    } catch (err: any) {
      setError(err.message || 'Failed to save daypart');
    }
  };

  const handleEdit = (daypart: DaypartDefinition) => {
    setEditingId(daypart.id);
    setFormData(daypart);
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this daypart definition?')) {
      return;
    }

    const { error } = await supabase
      .from('daypart_definitions')
      .delete()
      .eq('id', id);

    if (error) {
      setError('Failed to delete daypart');
    } else {
      await loadDayparts();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      daypart_name: '',
      display_label: '',
      description: '',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      default_start_time: '06:00:00',
      default_end_time: '11:00:00',
      default_days: [1, 2, 3, 4, 5, 6, 0],
      icon: 'Clock',
      sort_order: 0,
      is_active: true,
      concept_id: null
    });
    setError(null);
  };

  const toggleDay = (day: number) => {
    const current = formData.default_days || [];
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    setFormData({ ...formData, default_days: newDays });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Global Daypart Definitions</h1>
        <p className="text-slate-600">
          Define global daypart types that can be used across all sites for configuring daypart routines.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {(showAddForm || editingId) && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit Daypart Definition' : 'Add New Daypart'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Daypart Name (System ID) *
              </label>
              <input
                type="text"
                value={formData.daypart_name}
                onChange={(e) => setFormData({ ...formData, daypart_name: e.target.value })}
                placeholder="e.g., breakfast"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Label *
              </label>
              <input
                type="text"
                value={formData.display_label}
                onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                placeholder="e.g., Breakfast"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this daypart"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Color Theme
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Start Time
              </label>
              <input
                type="time"
                value={formData.default_start_time}
                onChange={(e) => setFormData({ ...formData, default_start_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default End Time
              </label>
              <input
                type="time"
                value={formData.default_end_time}
                onChange={(e) => setFormData({ ...formData, default_end_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (formData.default_days || []).includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAddForm && !editingId && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Daypart
        </button>
      )}

      <div className="space-y-4">
        {dayparts.map((daypart) => (
          <div
            key={daypart.id}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden"
          >
            <div className={`px-6 py-4 border-b border-slate-200 ${daypart.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {daypart.display_label}
                    {!daypart.is_active && (
                      <span className="text-xs px-2 py-1 bg-white/50 rounded">Inactive</span>
                    )}
                  </h3>
                  <p className="text-sm opacity-90 mt-1">{daypart.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(daypart)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Edit daypart"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(daypart.id)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Delete daypart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">System ID:</span>{' '}
                  <span className="text-slate-600">{daypart.daypart_name}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Default Time:</span>{' '}
                  <span className="text-slate-600">
                    {daypart.default_start_time} - {daypart.default_end_time}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Sort Order:</span>{' '}
                  <span className="text-slate-600">{daypart.sort_order}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="font-medium text-slate-700 text-sm">Default Days: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {daypart.default_days.sort().map((day) => {
                    const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                    return (
                      <span
                        key={day}
                        className="px-2 py-1 bg-white text-slate-600 text-xs rounded border border-slate-200"
                      >
                        {dayInfo?.short}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dayparts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Dayparts Defined</h3>
          <p className="text-slate-600 text-sm mb-4">Get started by adding your first daypart definition.</p>
        </div>
      )}
    </div>
  );
}
