import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Plus, Settings, Tag, Globe, Trash2, RefreshCw } from 'lucide-react';
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

interface AvailableAttribute {
  id: string;
  name: string;
  label: string;
  type: string;
  default_required: boolean;
  description: string | null;
  category: string | null;
  is_system: boolean;
}

export default function AttributeTemplateManager({ isOpen, onClose }: AttributeTemplateManagerProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AttributeTemplate | null>(null);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [showAddTranslation, setShowAddTranslation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState<AvailableAttribute[]>([]);
  const [showAddFromAvailable, setShowAddFromAvailable] = useState(false);
  const [selectedAvailableAttr, setSelectedAvailableAttr] = useState<string>('');

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
      const [templatesRes, settingsRes, availableRes] = await Promise.all([
        supabase.from('product_attribute_templates').select('*').order('name'),
        supabase.from('organization_settings').select('*').limit(1).maybeSingle(),
        supabase.from('available_attributes').select('*').order('category, name')
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      if (availableRes.data) setAvailableAttributes(availableRes.data);
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

  async function addAttributeFromAvailable() {
    if (!selectedTemplate || !selectedAvailableAttr) {
      alert('Please select an attribute');
      return;
    }

    const availableAttr = availableAttributes.find(a => a.id === selectedAvailableAttr);
    if (!availableAttr) return;

    setLoading(true);
    try {
      const attributeToAdd = {
        name: availableAttr.name,
        label: availableAttr.label,
        type: availableAttr.type,
        required: availableAttr.default_required
      };

      const updatedSchema = {
        ...selectedTemplate.attribute_schema,
        core_attributes: [...selectedTemplate.attribute_schema.core_attributes, attributeToAdd]
      };

      await supabase
        .from('product_attribute_templates')
        .update({ attribute_schema: updatedSchema })
        .eq('id', selectedTemplate.id);

      setSelectedAvailableAttr('');
      setShowAddFromAvailable(false);
      await loadData();
      alert('Attribute added successfully');
    } catch (error) {
      console.error('Error adding attribute:', error);
      alert('Failed to add attribute');
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

  async function removeAttribute(attributeName: string, attributeGroup: 'core' | 'extended') {
    if (!selectedTemplate) return;

    if (!confirm(`Remove attribute "${attributeName}"? This will affect all products using this template.`)) {
      return;
    }

    setLoading(true);
    try {
      const updatedSchema = {
        ...selectedTemplate.attribute_schema,
        core_attributes: attributeGroup === 'core'
          ? selectedTemplate.attribute_schema.core_attributes.filter(a => a.name !== attributeName)
          : selectedTemplate.attribute_schema.core_attributes,
        extended_attributes: attributeGroup === 'extended'
          ? selectedTemplate.attribute_schema.extended_attributes.filter(a => a.name !== attributeName)
          : selectedTemplate.attribute_schema.extended_attributes
      };

      await supabase
        .from('product_attribute_templates')
        .update({ attribute_schema: updatedSchema })
        .eq('id', selectedTemplate.id);

      await loadData();
      alert('Attribute removed successfully');
    } catch (error) {
      console.error('Error removing attribute:', error);
      alert('Failed to remove attribute');
    } finally {
      setLoading(false);
    }
  }

  function addTranslation() {
    if (!selectedTemplate || !newTranslation.locale || !newTranslation.locale_name) {
      alert('Please select a locale');
      return;
    }

    const translations = selectedTemplate.translations || [];

    // Check for duplicates
    if (translations.some(t => t.locale === newTranslation.locale)) {
      alert(`Translation for ${newTranslation.locale_name} already exists`);
      return;
    }

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

    translations.push({
      locale: newTranslation.locale,
      locale_name: newTranslation.locale_name,
      field_labels: fieldLabels
    });

    setSelectedTemplate({
      ...selectedTemplate,
      translations
    });

    setNewTranslation({ locale: '', locale_name: '' });
    setShowAddTranslation(false);
    setHasUnsavedChanges(true);
  }

  function removeTranslation(locale: string) {
    if (!selectedTemplate) return;

    const translations = (selectedTemplate.translations || []).filter(t => t.locale !== locale);

    setSelectedTemplate({
      ...selectedTemplate,
      translations
    });
    setHasUnsavedChanges(true);
  }

  function updateTranslationLabel(locale: string, fieldName: string, newLabel: string) {
    if (!selectedTemplate) return;

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

    setSelectedTemplate({
      ...selectedTemplate,
      translations
    });
    setHasUnsavedChanges(true);
  }

  async function saveTranslations() {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      await supabase
        .from('product_attribute_templates')
        .update({ translations: selectedTemplate.translations })
        .eq('id', selectedTemplate.id);

      setHasUnsavedChanges(false);
      await loadData();
    } catch (error) {
      console.error('Error saving translations:', error);
      alert('Failed to save translations');
    } finally {
      setLoading(false);
    }
  }

  async function pushToExistingProducts() {
    if (!selectedTemplate) return;

    const confirmed = confirm(
      `This will update all products using the "${selectedTemplate.name}" template with any missing attributes. ` +
      `Existing attribute values will not be changed. Continue?`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      // Get all products using this template
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, attributes')
        .eq('attribute_template_id', selectedTemplate.id);

      if (fetchError) throw fetchError;

      if (!products || products.length === 0) {
        alert('No products found using this template');
        return;
      }

      // Get all attribute names from the template
      const allTemplateAttrs = [
        ...selectedTemplate.attribute_schema.core_attributes,
        ...selectedTemplate.attribute_schema.extended_attributes
      ];

      let updatedCount = 0;

      // Update each product
      for (const product of products) {
        const currentAttrs = product.attributes || {};
        let needsUpdate = false;
        const updatedAttrs = { ...currentAttrs };

        // Add missing attributes with appropriate defaults
        for (const attr of allTemplateAttrs) {
          if (!(attr.name in updatedAttrs)) {
            needsUpdate = true;

            // Set appropriate default based on type
            if (attr.type === 'sizes') {
              updatedAttrs[attr.name] = [];
            } else if (attr.type === 'boolean') {
              updatedAttrs[attr.name] = false;
            } else if (attr.type === 'number') {
              updatedAttrs[attr.name] = null;
            } else if (attr.type === 'array') {
              updatedAttrs[attr.name] = [];
            } else if (attr.type === 'object') {
              updatedAttrs[attr.name] = {};
            } else {
              updatedAttrs[attr.name] = '';
            }
          }
        }

        // Add missing translation attributes
        if (selectedTemplate.translations) {
          for (const translation of selectedTemplate.translations) {
            const translationKey = `translations_${translation.locale.replace('-', '_').toLowerCase()}`;
            if (!(translationKey in updatedAttrs)) {
              needsUpdate = true;
              updatedAttrs[translationKey] = {};
            }
          }
        }

        // Only update if there are missing attributes
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              attributes: updatedAttrs,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`Error updating product ${product.id}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }

      alert(
        `Successfully updated ${updatedCount} of ${products.length} products. ` +
        `${products.length - updatedCount} products already had all attributes.`
      );
    } catch (error) {
      console.error('Error pushing to products:', error);
      alert('Failed to push changes to products');
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Template Details: {selectedTemplate.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={pushToExistingProducts}
                        disabled={loading}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                        title="Update all products using this template with any missing attributes"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Push to Products
                      </button>
                      <button
                        onClick={() => setShowAddTranslation(!showAddTranslation)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Translation
                      </button>
                    </div>
                  </div>

                  {showAddTranslation && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
                        {commonLocales.filter(locale => {
                          const existingLocales = selectedTemplate.translations?.map(t => t.locale) || [];
                          return !existingLocales.includes(locale.code);
                        }).map(locale => (
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

                  {selectedTemplate.translations && selectedTemplate.translations.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {selectedTemplate.translations.map((translation) => (
                        <div key={translation.locale} className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm">
                          <Globe className="w-3.5 h-3.5" />
                          <span className="font-medium">{translation.locale_name}</span>
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${translation.locale_name} translation?`)) {
                                removeTranslation(translation.locale);
                              }
                            }}
                            className="text-blue-700 hover:text-red-600 transition-colors"
                            title="Remove translation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Core Attributes
                        </h4>
                        <button
                          onClick={() => setShowAddFromAvailable(!showAddFromAvailable)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add from Library
                        </button>
                      </div>

                      {showAddFromAvailable && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                          <select
                            value={selectedAvailableAttr}
                            onChange={(e) => setSelectedAvailableAttr(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select an attribute...</option>
                            {(() => {
                              const existingNames = [
                                ...selectedTemplate.attribute_schema.core_attributes.map(a => a.name),
                                ...selectedTemplate.attribute_schema.extended_attributes.map(a => a.name)
                              ];

                              const filteredAttrs = availableAttributes.filter(attr => !existingNames.includes(attr.name));

                              const groups = filteredAttrs.reduce((acc: Record<string, AvailableAttribute[]>, attr) => {
                                const category = attr.category || 'other';
                                if (!acc[category]) acc[category] = [];
                                acc[category].push(attr);
                                return acc;
                              }, {});

                              return Object.entries(groups).map(([category, attrs]) => (
                                <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                                  {attrs.map(attr => (
                                    <option key={attr.id} value={attr.id}>
                                      {attr.label} ({attr.type})
                                    </option>
                                  ))}
                                </optgroup>
                              ));
                            })()}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={addAttributeFromAvailable}
                              disabled={loading || !selectedAvailableAttr}
                              className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Add Attribute
                            </button>
                            <button
                              onClick={() => {
                                setShowAddFromAvailable(false);
                                setSelectedAvailableAttr('');
                              }}
                              className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
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
                                  <button
                                    onClick={() => removeAttribute(attr.name, 'core')}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Remove attribute"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
                                    <button
                                      onClick={() => removeAttribute(attr.name, 'extended')}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Remove attribute"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <button
                  onClick={saveTranslations}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              )}
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
    </div>
  );
}
