import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Theme {
  id?: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  metadata: Record<string, any>;
}

interface DisplayType {
  id: string;
  name: string;
  category: string;
}

interface ThemeModalProps {
  theme?: Theme | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ThemeModal({ theme, onClose, onSave }: ThemeModalProps) {
  const [formData, setFormData] = useState({
    name: theme?.name || '',
    description: theme?.description || '',
    status: theme?.status || 'draft'
  });
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [selectedDisplayTypes, setSelectedDisplayTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDisplayTypes();
    if (theme?.id) {
      loadThemeDisplayTypes(theme.id);
    }
  }, [theme]);

  const loadDisplayTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('display_types')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error loading display types:', error);
    } else {
      setDisplayTypes(data || []);
    }
    setLoading(false);
  };

  const loadThemeDisplayTypes = async (themeId: string) => {
    const { data, error } = await supabase
      .from('theme_content')
      .select('display_type_id')
      .eq('theme_id', themeId);

    if (error) {
      console.error('Error loading theme display types:', error);
    } else {
      setSelectedDisplayTypes(data?.map(tc => tc.display_type_id) || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (theme?.id) {
        const { error: updateError } = await supabase
          .from('themes')
          .update({
            name: formData.name,
            description: formData.description || null,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', theme.id);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('theme_content')
          .delete()
          .eq('theme_id', theme.id);

        if (deleteError) throw deleteError;

        if (selectedDisplayTypes.length > 0) {
          const themeContentData = selectedDisplayTypes.map(displayTypeId => ({
            theme_id: theme.id,
            display_type_id: displayTypeId,
            content_data: {},
            status: 'draft'
          }));

          const { error: insertError } = await supabase
            .from('theme_content')
            .insert(themeContentData);

          if (insertError) throw insertError;
        }
      } else {
        const { data: newTheme, error: insertError } = await supabase
          .from('themes')
          .insert({
            name: formData.name,
            description: formData.description || null,
            status: formData.status,
            metadata: {}
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (selectedDisplayTypes.length > 0) {
          const themeContentData = selectedDisplayTypes.map(displayTypeId => ({
            theme_id: newTheme.id,
            display_type_id: displayTypeId,
            content_data: {},
            status: 'draft'
          }));

          const { error: contentError } = await supabase
            .from('theme_content')
            .insert(themeContentData);

          if (contentError) throw contentError;
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving theme:', error);
      alert(`Failed to save theme: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleDisplayType = (displayTypeId: string) => {
    setSelectedDisplayTypes(prev =>
      prev.includes(displayTypeId)
        ? prev.filter(id => id !== displayTypeId)
        : [...prev, displayTypeId]
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'digital_signage':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'esl':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'print':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'social_media':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {theme ? 'Edit Theme' : 'Create New Theme'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Theme Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter theme name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter theme description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Display Types
            </label>
            {loading ? (
              <div className="text-sm text-slate-600">Loading display types...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayTypes.map((displayType) => (
                  <label
                    key={displayType.id}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedDisplayTypes.includes(displayType.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDisplayTypes.includes(displayType.id)}
                      onChange={() => toggleDisplayType(displayType.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{displayType.name}</div>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded border ${getCategoryColor(displayType.category)}`}>
                        {displayType.category.replace('_', ' ')}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : theme ? 'Save Changes' : 'Create Theme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
