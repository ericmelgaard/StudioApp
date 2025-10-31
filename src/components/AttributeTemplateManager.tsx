import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Plus, Settings, Tag, Globe, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TranslationConfig {
  locale: string;
  locale_name: string;
  field_labels: Record<string, string>;
}

interface AttributeTemplate {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  attribute_schema: {
    core_attributes: AttributeField[];
    extended_attributes: AttributeField[];
  };
  translations?: TranslationConfig[];
}

interface AttributeField {
  name: string;
  type: string;
  required: boolean;
  label: string;
}

interface OrganizationSettings {
  id: string;
  default_product_attribute_template_id: string | null;
}

interface AttributeTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AttributeTemplateManager({ isOpen, onClose }: AttributeTemplateManagerProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AttributeTemplate | null>(null);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [showAddTranslation, setShowAddTranslation] = useState(false);

  const [newAttribute, setNewAttribute] = useState({
    name: '',
    label: '',
    type: 'text',
    required: false,
    attributeGroup: 'extended' as 'core' | 'extended'
  });

  const [newTranslation, setNewTranslation] = useState({
    locale: '',
    locale_name: ''
  });

  const commonLocales = [
    { code: 'fr-FR', name: 'French' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-PT', name: 'Portuguese' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'ko-KR', name: 'Korean' },
  ];

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const [templatesRes, settingsRes] = await Promise.all([
        supabase.from('product_attribute_templates').select('*').order('name'),
        supabase.from('organization_settings').select('*').limit(1).maybeSingle()
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function setDefaultTemplate(templateId: string) {
    setLoading(true);
    try {
      if (settings) {
        await supabase
          .from('organization_settings')
          .update({ default_product_attribute_template_id: templateId })
          .eq('id', settings.id);
      } else {
        await supabase
          .from('organization_settings')
          .insert({
            organization_id: null,
            default_product_attribute_template_id: templateId
          });
      }
      await loadData();
      alert('Default template updated successfully');
    } catch (error) {
      console.error('Error setting default template:', error);
      alert('Failed to set default template');
    } finally {
      setLoading(false);
    }
  }

  async function addAttributeToTemplate() {
    if (!selectedTemplate || !newAttribute.name || !newAttribute.label) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const attributeToAdd = {
        name: newAttribute.name,
        label: newAttribute.label,
        type: newAttribute.type,
        required: newAttribute.required
      };

      const updatedSchema = {
        ...selectedTemplate.attribute_schema,
        core_attributes: newAttribute.attributeGroup === 'core'
          ? [...selectedTemplate.attribute_schema.core_attributes, attributeToAdd]
          : selectedTemplate.attribute_schema.core_attributes,
        extended_attributes: newAttribute.attributeGroup === 'extended'
          ? [...selectedTemplate.attribute_schema.extended_attributes, attributeToAdd]
          : selectedTemplate.attribute_schema.extended_attributes
      };

      await supabase
        .from('product_attribute_templates')
        .update({ attribute_schema: updatedSchema })
        .eq('id', selectedTemplate.id);

      setNewAttribute({ name: '', label: '', type: 'text', required: false, attributeGroup: 'extended' });
      setShowAddAttribute(false);
      await loadData();
      alert('Attribute added successfully');
    } catch (error) {
      console.error('Error adding attribute:', error);
      alert('Failed to add attribute');
    } finally {
      setLoading(false);
    }
  }

  async function addTranslation() {
    if (!selectedTemplate || !newTranslation.locale || !newTranslation.locale_name) {
      alert('Please select a locale');
      return;
    }

    setLoading(true);
    try {
      // Get all translatable fields
      const translatableFields = [
        ...selectedTemplate.attribute_schema.core_attributes,
        ...selectedTemplate.attribute_schema.extended_attributes
      ].filter(attr => attr.type === 'text' || attr.type === 'number' || attr.type === 'richtext');

      // Initialize with default labels (same as original)
      const fieldLabels: Record<string, string> = {};
      translatableFields.forEach(field => {
        fieldLabels[field.name] = field.label;
      });

      const translations = selectedTemplate.translations || [];
      translations.push({
        locale: newTranslation.locale,
        locale_name: newTranslation.locale_name,
        field_labels: fieldLabels
      });

      await supabase
        .from('product_attribute_templates')
        .update({ translations })
        .eq('id', selectedTemplate.id);

      setNewTranslation({ locale: '', locale_name: '' });
      setShowAddTranslation(false);
      await loadData();
    } catch (error) {
      console.error('Error adding translation:', error);
      alert('Failed to add translation');
    } finally {
      setLoading(false);
    }
  }

  async function removeTranslation(locale: string) {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const translations = (selectedTemplate.translations || []).filter(t => t.locale !== locale);

      await supabase
        .from('product_attribute_templates')
        .update({ translations })
        .eq('id', selectedTemplate.id);

      await loadData();
    } catch (error) {
      console.error('Error removing translation:', error);
      alert('Failed to remove translation');
    } finally {
      setLoading(false);
    }
  }

  async function updateTranslationLabel(locale: string, fieldName: string, newLabel: string) {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const translations = (selectedTemplate.translations || []).map(t => {
        if (t.locale === locale) {
          return {
            ...t,
            field_labels: {
              ...t.field_labels,
              [fieldName]: newLabel
            }
          };
        }
        return t;
      });

      await supabase
        .from('product_attribute_templates')
        .update({ translations })
        .eq('id', selectedTemplate.id);

      await loadData();
    } catch (error) {
      console.error('Error updating translation label:', error);
      alert('Failed to update translation label');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const defaultTemplateId = settings?.default_product_attribute_template_id;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="relative z-[61] bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Product Attribute Templates</h2>
              <p className="text-sm text-slate-600">Manage templates and set organization default</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Templates</h3>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${
                      defaultTemplateId === template.id
                        ? 'ring-2 ring-green-500 ring-offset-2'
                        : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <h4 className="font-semibold text-slate-900">{template.name}</h4>
                          {defaultTemplateId === template.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" />
                              Default
                            </span>
                          )}
                          {template.is_system && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          {template.attribute_schema.core_attributes.length} core + {' '}
                          {template.attribute_schema.extended_attributes.length} extended attributes
                        </div>
                      </div>
                      {defaultTemplateId !== template.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultTemplate(template.id);
                          }}
                          disabled={loading}
                          className="ml-2 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {selectedTemplate ? (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Template Details: {selectedTemplate.name}
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Core Attributes
                      </h4>
                      <div className="space-y-2">
                        {selectedTemplate.attribute_schema.core_attributes.map((attr) => {
                          const translatableFields = selectedTemplate.translations || [];
                          const isTranslatable = attr.type === 'text' || attr.type === 'number' || attr.type === 'richtext';

                          return (
                            <div key={attr.name} className="p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-slate-900">{attr.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">{attr.type}</span>
                                  {attr.required && (
                                    <span className="text-xs font-medium text-red-600">Required</span>
                                  )}
                                </div>
                              </div>
                              {isTranslatable && translatableFields.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  {translatableFields.map((translation) => (
                                    <div key={translation.locale} className="flex items-center gap-2">
                                      <span className="text-xs text-slate-600 w-20 flex-shrink-0">{translation.locale_name}:</span>
                                      <input
                                        type="text"
                                        value={translation.field_labels[attr.name] || attr.label}
                                        onChange={(e) => updateTranslationLabel(translation.locale, attr.name, e.target.value)}
                                        className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={`${translation.locale_name} label`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Extended Attributes
                        </h4>
                        <button
                          onClick={() => setShowAddAttribute(!showAddAttribute)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Attribute
                        </button>
                      </div>

                      {showAddAttribute && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setNewAttribute({ ...newAttribute, attributeGroup: 'core' })}
                              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                                newAttribute.attributeGroup === 'core'
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Core Attribute
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAttribute({ ...newAttribute, attributeGroup: 'extended' })}
                              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                                newAttribute.attributeGroup === 'extended'
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Extended Attribute
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Field name (e.g., extra_description)"
                            value={newAttribute.name}
                            onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="Label (e.g., Extra Description)"
                            value={newAttribute.label}
                            onChange={(e) => setNewAttribute({ ...newAttribute, label: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={newAttribute.type}
                              onChange={(e) => setNewAttribute({ ...newAttribute, type: e.target.value })}
                              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="text">Text</option>
                              <option value="richtext">Rich Text</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="image">Image</option>
                              <option value="translation">Translation</option>
                              <option value="array">Array</option>
                              <option value="object">Object</option>
                            </select>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newAttribute.required}
                                onChange={(e) => setNewAttribute({ ...newAttribute, required: e.target.checked })}
                                className="w-4 h-4 text-purple-600 border-slate-300 rounded"
                              />
                              <span className="text-sm text-slate-700">Required</span>
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={addAttributeToTemplate}
                              disabled={loading}
                              className="flex-1 px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              Add Attribute
                            </button>
                            <button
                              onClick={() => {
                                setShowAddAttribute(false);
                                setNewAttribute({ name: '', label: '', type: 'text', required: false, attributeGroup: 'extended' });
                              }}
                              className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {selectedTemplate.attribute_schema.extended_attributes.length === 0 ? (
                          <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                            No extended attributes yet. Add one above.
                          </p>
                        ) : (
                          selectedTemplate.attribute_schema.extended_attributes.map((attr) => {
                            const translatableFields = selectedTemplate.translations || [];
                            const isTranslatable = attr.type === 'text' || attr.type === 'number' || attr.type === 'richtext';

                            return (
                              <div key={attr.name} className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm text-slate-900">{attr.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">{attr.type}</span>
                                    {attr.required && (
                                      <span className="text-xs font-medium text-red-600">Required</span>
                                    )}
                                  </div>
                                </div>
                                {isTranslatable && translatableFields.length > 0 && (
                                  <div className="mt-2 space-y-1.5">
                                    {translatableFields.map((translation) => (
                                      <div key={translation.locale} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-600 w-20 flex-shrink-0">{translation.locale_name}:</span>
                                        <input
                                          type="text"
                                          value={translation.field_labels[attr.name] || attr.label}
                                          onChange={(e) => updateTranslationLabel(translation.locale, attr.name, e.target.value)}
                                          className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder={`${translation.locale_name} label`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Translations Section */}
                    <div className="pt-6 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Translations
                        </h4>
                        <button
                          onClick={() => setShowAddTranslation(!showAddTranslation)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Translation
                        </button>
                      </div>

                      {showAddTranslation && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <select
                            value={newTranslation.locale}
                            onChange={(e) => {
                              const selected = commonLocales.find(l => l.code === e.target.value);
                              setNewTranslation({
                                locale: e.target.value,
                                locale_name: selected?.name || ''
                              });
                            }}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                          >
                            <option value="">Select a language...</option>
                            {commonLocales.map(locale => (
                              <option key={locale.code} value={locale.code}>
                                {locale.name} ({locale.code})
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={addTranslation}
                              disabled={loading || !newTranslation.locale}
                              className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Add Translation
                            </button>
                            <button
                              onClick={() => {
                                setShowAddTranslation(false);
                                setNewTranslation({ locale: '', locale_name: '' });
                              }}
                              className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {(!selectedTemplate.translations || selectedTemplate.translations.length === 0) ? (
                          <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                            No translations enabled. Add one above.
                          </p>
                        ) : (
                          selectedTemplate.translations.map((translation) => {
                            const translatableFields = [
                              ...selectedTemplate.attribute_schema.core_attributes,
                              ...selectedTemplate.attribute_schema.extended_attributes
                            ].filter(attr => attr.type === 'text' || attr.type === 'number' || attr.type === 'richtext');

                            return (
                              <div key={translation.locale} className="p-4 bg-white rounded-lg border-2 border-slate-300">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                                  <div>
                                    <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                                      <Globe className="w-4 h-4 text-blue-600" />
                                      {translation.locale_name}
                                    </h5>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{translation.locale}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Remove ${translation.locale_name} translation?`)) {
                                        removeTranslation(translation.locale);
                                      }
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Remove translation"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Customize Field Labels:
                                  </p>
                                  {translatableFields.map(field => (
                                    <div key={field.name} className="space-y-1">
                                      <label className="block text-xs font-medium text-slate-600">
                                        {field.label} → {translation.locale_name} Translation
                                      </label>
                                      <input
                                        type="text"
                                        value={translation.field_labels[field.name] || field.label}
                                        onChange={(e) => updateTranslationLabel(translation.locale, field.name, e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={`Enter ${translation.locale_name} label for "${field.label}"`}
                                      />
                                      <p className="text-xs text-slate-500 italic">
                                        Field: <span className="font-mono">{field.name}</span>
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a template to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {defaultTemplateId ? (
                <>
                  <span className="font-medium text-slate-900">Default template set.</span> New products will use this template by default.
                </>
              ) : (
                <>
                  <span className="font-medium text-amber-700">No default template set.</span> Select a template and click "Set Default".
                </>
              )}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
