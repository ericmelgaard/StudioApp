import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Edit2, Languages } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  sort_order: number;
  translations: Translation[];
  integration_source_id: string | null;
  integration_category_id: string | null;
}

interface Translation {
  locale: string;
  locale_name: string;
  name: string;
  description: string;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryManagementModal({ isOpen, onClose }: CategoryManagementModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTranslations, setEditTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [availableLocales, setAvailableLocales] = useState<{code: string, name: string}[]>([]);

  const commonLocales = [
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'ko-KR', name: 'Korean (Korea)' },
    { code: 'nl-NL', name: 'Dutch (Netherlands)' },
  ];

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadAvailableLocales();
    }
  }, [isOpen]);

  async function loadAvailableLocales() {
    const { data } = await supabase
      .from('product_attribute_templates')
      .select('translations')
      .not('translations', 'is', null);

    const localesSet = new Set<string>();
    data?.forEach(template => {
      const translations = template.translations as any[];
      translations?.forEach(t => {
        localesSet.add(`${t.locale}|${t.locale_name}`);
      });
    });

    const locales = Array.from(localesSet).map(str => {
      const [code, name] = str.split('|');
      return { code, name };
    });

    setAvailableLocales(locales);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  }

  async function handleAddCategory() {
    const newCategory = {
      name: 'New Category',
      description: '',
      sort_order: categories.length,
      translations: [],
    };

    const { data, error } = await supabase
      .from('product_categories')
      .insert([newCategory])
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data]);
      setEditingId(data.id);
      setEditName(data.name);
      setEditDescription(data.description || '');
      setEditTranslations([]);
    }
  }

  async function handleSave() {
    if (!editingId) return;

    setLoading(true);
    const { error } = await supabase
      .from('product_categories')
      .update({
        name: editName,
        description: editDescription || null,
        translations: editTranslations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingId);

    if (!error) {
      await loadCategories();
      setEditingId(null);
      setEditName('');
      setEditDescription('');
      setEditTranslations([]);
      setShowTranslations(false);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Products assigned to it will be unassigned.')) return;

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadCategories();
      if (editingId === id) {
        setEditingId(null);
        setEditName('');
        setEditDescription('');
        setEditTranslations([]);
      }
    }
  }

  function handleEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditTranslations(category.translations || []);
    setShowTranslations(false);
  }

  function handleCancel() {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditTranslations([]);
    setShowTranslations(false);
  }

  function addTranslationLocale(locale: string, localeName: string) {
    if (!editTranslations.find(t => t.locale === locale)) {
      setEditTranslations([
        ...editTranslations,
        { locale, locale_name: localeName, name: '', description: '' }
      ]);
    }
  }

  function removeTranslationLocale(locale: string) {
    setEditTranslations(editTranslations.filter(t => t.locale !== locale));
  }

  function updateTranslation(locale: string, field: 'name' | 'description', value: string) {
    setEditTranslations(editTranslations.map(t =>
      t.locale === locale ? { ...t, [field]: value } : t
    ));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Manage Categories</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-600">
              Create and manage product categories. Categories can be assigned to multiple products.
            </p>
            <button
              onClick={handleAddCategory}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`border rounded-lg p-4 transition-colors ${
                  editingId === category.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {editingId === category.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter category name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter description"
                        rows={2}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-slate-700">
                          Translations
                        </label>
                        <button
                          onClick={() => setShowTranslations(!showTranslations)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Languages className="w-4 h-4" />
                          {showTranslations ? 'Hide' : 'Show'} Translations
                        </button>
                      </div>

                      {showTranslations && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          {availableLocales.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">
                              No translation locales enabled. Add translations to your Product Attribute Templates first.
                            </p>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {availableLocales.map((locale) => {
                                  const hasLocale = editTranslations.find(t => t.locale === locale.code);
                                  return (
                                    <button
                                      key={locale.code}
                                      onClick={() => {
                                        if (hasLocale) {
                                          removeTranslationLocale(locale.code);
                                        } else {
                                          addTranslationLocale(locale.code, locale.name);
                                        }
                                      }}
                                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                        hasLocale
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
                                      }`}
                                    >
                                      {locale.name}
                                    </button>
                                  );
                                })}
                              </div>

                              {editTranslations.map((translation) => (
                                <div key={translation.locale} className="p-4 bg-white rounded-lg border border-slate-200">
                                  <h4 className="text-sm font-bold text-slate-900 mb-3">
                                    {translation.locale_name}
                                  </h4>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Translated Name
                                      </label>
                                      <input
                                        type="text"
                                        value={translation.name}
                                        onChange={(e) => updateTranslation(translation.locale, 'name', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder={`Enter ${translation.locale_name} name`}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Translated Description
                                      </label>
                                      <textarea
                                        value={translation.description}
                                        onChange={(e) => updateTranslation(translation.locale, 'description', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder={`Enter ${translation.locale_name} description`}
                                        rows={2}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={loading || !editName.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                      )}
                      {category.translations && category.translations.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Languages className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {category.translations.length} translation(s)
                          </span>
                        </div>
                      )}
                      {category.integration_source_id && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Synced from Integration
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p>No categories yet. Click "Add Category" to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
