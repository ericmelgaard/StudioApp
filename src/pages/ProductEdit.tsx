import { useState, useEffect, useRef, memo } from 'react';
import { Save, AlertCircle, Info, Tag, Image as ImageIcon, List, Copy, Check, Globe, ChevronDown, X, Plus, Link, Link2, Unlink, Pencil, Lock, GripVertical, FileText, Calculator, Calendar, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Breadcrumb from '../components/Breadcrumb';
import ImageUploadField from '../components/ImageUploadField';
import RichTextEditor from '../components/RichTextEditor';
import FieldLinkModal, { FieldLinkData } from '../components/FieldLinkModal';
import PriceConfigModal, { PriceConfig } from '../components/PriceConfigModal';
import TranslationEditor from '../components/TranslationEditor';
import { StateBadge } from '../components/StateBadge';
import ApiLinkModal from '../components/ApiLinkModal';
import { productValueResolver } from '../lib/productValueResolver';
import { integrationLinkService } from '../lib/integrationLinkService';
import { LocationProductService } from '../lib/locationProductService';
import { useLocation } from '../hooks/useLocation';
import { ApiIntegrationSection } from '../components/ApiIntegrationSection';

interface ProductData {
  id?: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  attribute_overrides?: Record<string, boolean>;
  attribute_mappings?: Record<string, FieldLinkData>;
  disabled_sync_fields?: string[];
  active_integration_source_id?: string;
  last_sync_metadata?: Record<string, any>;
  mapping_id?: string | null;
  integration_source_id?: string | null;
  integration_type?: 'product' | 'modifier' | 'discount' | null;
  local_fields?: string[];
  price_calculations?: Record<string, PriceConfig>;
  last_synced_at?: string | null;
  parent_product_id?: string | null;
}

interface ProductEditProps {
  productId?: string;
  mode: 'create' | 'edit';
  onBack: () => void;
  onSave: (product: ProductData) => void;
}

interface Option {
  id: string;
  label: string;
  description?: string;
  price: number;
  calories?: number;
  sort_order: number;
  integration_link?: {
    mapping_id: string;
    integration_type: 'product' | 'modifier' | 'discount';
    integration_source_id: string;
  };
  local_fields?: string[];
  price_calculation?: PriceConfig;
}

interface OptionsEditorProps {
  options: Option[];
  onChange: (options: Option[]) => void;
  integrationSourceId?: string | null;
  expandedRichTextFields: Set<string>;
  setExpandedRichTextFields: (fields: Set<string>) => void;
}

const OptionsEditor = memo(function OptionsEditor({ options, onChange, integrationSourceId, expandedRichTextFields, setExpandedRichTextFields }: OptionsEditorProps) {
  const [showPriceCalcModal, setShowPriceCalcModal] = useState(false);
  const [linkingOptionId, setLinkingOptionId] = useState<string | null>(null);
  const [showApiLinkModal, setShowApiLinkModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [openOptionDropdown, setOpenOptionDropdown] = useState<string | null>(null);

  const addOption = () => {
    const maxSortOrder = options.length > 0 ? Math.max(...options.map(o => o.sort_order)) : 0;
    const newOption: Option = {
      id: crypto.randomUUID(),
      label: '',
      description: '',
      price: 0,
      calories: 0,
      sort_order: maxSortOrder + 1,
    };
    onChange([...options, newOption]);
  };

  const updateOption = (id: string, updates: Partial<Option>) => {
    onChange(options.map(option => option.id === id ? { ...option, ...updates } : option));
  };

  const removeOption = (id: string) => {
    onChange(options.filter(option => option.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOptions = [...options];
    const draggedOption = newOptions[draggedIndex];
    newOptions.splice(draggedIndex, 1);
    newOptions.splice(index, 0, draggedOption);

    newOptions.forEach((opt, idx) => {
      opt.sort_order = idx + 1;
    });

    onChange(newOptions);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleIntegrationLink = (mapping_id: string, integration_type: 'product' | 'modifier' | 'discount') => {
    if (linkingOptionId && integrationSourceId) {
      updateOption(linkingOptionId, {
        integration_link: {
          mapping_id,
          integration_type,
          integration_source_id: integrationSourceId
        }
      });
    }
    setShowApiLinkModal(false);
  };

  const handleIntegrationUnlink = (optionId: string) => {
    updateOption(optionId, { integration_link: undefined, local_fields: undefined });
  };

  const enableLocalOverride = (optionId: string, field: string) => {
    const option = options.find(o => o.id === optionId);
    if (!option) return;

    const localFields = option.local_fields || [];
    if (!localFields.includes(field)) {
      updateOption(optionId, {
        local_fields: [...localFields, field]
      });
    }
  };

  const clearLocalOverride = (optionId: string, field: string) => {
    const option = options.find(o => o.id === optionId);
    if (!option) return;

    const localFields = option.local_fields || [];
    updateOption(optionId, {
      local_fields: localFields.filter(f => f !== field)
    });
  };

  const sortedOptions = [...options].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Options</h3>
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      </div>

      <div className="space-y-4">
        {sortedOptions.map((option, index) => {
          const hasIntegrationLink = !!option.integration_link;
          const localFields = option.local_fields || [];

          return (
            <div
              key={option.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`bg-slate-50 border border-slate-200 rounded-lg p-4 transition-all ${
                draggedIndex === index ? 'opacity-50' : 'opacity-100'
              } hover:border-slate-300`}
            >
              <div className="flex gap-3">
                <div className="flex items-start pt-2 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-5 h-5 text-slate-400" />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500">#{option.sort_order}</span>
                      {hasIntegrationLink && (
                        <div className="flex items-center gap-2">
                          <StateBadge variant="api" text="Linked to API" />
                          <button
                            type="button"
                            onClick={() => handleIntegrationUnlink(option.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Unlink from integration"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {!hasIntegrationLink && integrationSourceId && (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkingOptionId(option.id);
                            setShowApiLinkModal(true);
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors flex items-center gap-1"
                        >
                          <Link className="w-3 h-3" />
                          Link to API
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(option.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Label</label>
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => {
                          if (hasIntegrationLink && !localFields.includes('label')) {
                            enableLocalOverride(option.id, 'label');
                          }
                          updateOption(option.id, { label: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="e.g., Small, Medium, Large"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                      <input
                        type="text"
                        value={option.description || ''}
                        onChange={(e) => {
                          if (hasIntegrationLink && !localFields.includes('description')) {
                            enableLocalOverride(option.id, 'description');
                          }
                          updateOption(option.id, { description: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={option.price}
                            onChange={(e) => {
                              if (hasIntegrationLink && !localFields.includes('price')) {
                                enableLocalOverride(option.id, 'price');
                              }
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                updateOption(option.id, { price: parseFloat(value) || 0 });
                              }
                            }}
                            className="w-full pl-7 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Calories</label>
                        <input
                          type="number"
                          value={option.calories || 0}
                          onChange={(e) => {
                            if (hasIntegrationLink && !localFields.includes('calories')) {
                              enableLocalOverride(option.id, 'calories');
                            }
                            updateOption(option.id, { calories: parseInt(e.target.value) || 0 });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showApiLinkModal && (
        <ApiLinkModal
          isOpen={showApiLinkModal}
          onClose={() => {
            setShowApiLinkModal(false);
            setLinkingOptionId(null);
          }}
          onLink={handleIntegrationLink}
          integrationSourceId={integrationSourceId}
          title="Link Option to API"
          searchType="all"
        />
      )}
    </>
  );
});

export default function ProductEdit({ productId, mode, onBack, onSave }: ProductEditProps) {
  const { location } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateSchema, setTemplateSchema] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [policyViolations, setPolicyViolations] = useState<any[]>([]);
  const [currentProduct, setCurrentProduct] = useState<ProductData | null>(null);
  const [linkedSources, setLinkedSources] = useState<any[]>([]);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);

  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showLocaleDropdown, setShowLocaleDropdown] = useState(false);
  const [expandedRichTextFields, setExpandedRichTextFields] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [fieldLinks, setFieldLinks] = useState<Record<string, FieldLinkData>>({});
  const [showPriceCaloriesLinkModal, setShowPriceCaloriesLinkModal] = useState(false);
  const [linkingFieldKey, setLinkingFieldKey] = useState<string | null>(null);
  const [showProductApiLinkModal, setShowProductApiLinkModal] = useState(false);

  const [activeSection, setActiveSection] = useState('basic-info');
  const [idCopied, setIdCopied] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const originalDataRef = useRef<{ name: string; attributes: Record<string, any> } | null>(null);

  useEffect(() => {
    loadData();
  }, [productId]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      const sections = getSections();

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sectionRefs.current[sections[i].id];
        if (section) {
          const offsetTop = section.offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveSection(sections[i].id);
            return;
          }
        }
      }

      if (sections.length > 0) {
        setActiveSection(sections[0].id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [productId]);

  const checkIfDirty = () => {
    if (!originalDataRef.current) {
      return mode === 'create' ? (name !== '' || Object.keys(attributes).length > 0) : true;
    }

    return JSON.stringify({ name, attributes }) !== JSON.stringify(originalDataRef.current);
  };

  useEffect(() => {
    setIsDirty(checkIfDirty());
  }, [name, attributes]);

  const loadData = async () => {
    setLoading(true);

    try {
      const { data: templates, error: templatesError } = await supabase
        .from('attribute_templates')
        .select('*')
        .order('name');

      if (!templatesError && templates) {
        setAvailableTemplates(templates);
      }

      if (productId && mode === 'edit') {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error loading product:', fetchError);
          setError('Failed to load product');
        } else if (data) {
          setName(data.name);
          setAttributes(data.attributes || {});
          setSelectedTemplateId(data.attribute_template_id || '');
          setCurrentProduct(data);
          originalDataRef.current = { name: data.name, attributes: data.attributes || {} };

          if (data.attribute_template_id) {
            await loadTemplateForEdit(data.attribute_template_id);
          }

          try {
            const { data: violations } = await supabase
              .from('product_policy_violations')
              .select('*, product_policies(display_name)')
              .eq('product_id', productId)
              .eq('status', 'active');

            if (violations) {
              setPolicyViolations(violations);
            }
          } catch (err) {
            console.log('Policy violations table not available');
          }
        }
      } else if (mode === 'create') {
        originalDataRef.current = null;
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }

    setLoading(false);
  };

  const loadTemplateForEdit = async (templateId: string) => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('attribute_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (templateError) throw templateError;
      if (!templateData) return;

      setTemplate(templateData);
      setTemplateSchema(templateData.schema);
    } catch (err) {
      console.error('Error loading template:', err);
    }
  };

  const loadTemplateForCreate = async (templateId: string) => {
    if (!templateId) return;

    try {
      const { data: templateData, error: templateError } = await supabase
        .from('attribute_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (templateError) throw templateError;
      if (!templateData) return;

      setTemplate(templateData);
      setTemplateSchema(templateData.schema);

      const schema = templateData.schema;
      const defaultAttrs: Record<string, any> = {};

      const allAttrs = [
        ...(schema.core_attributes || []),
        ...(schema.extended_attributes || [])
      ];

      allAttrs.forEach((attr: any) => {
        if (attr.type === 'multiselect') {
          defaultAttrs[attr.name] = [];
        } else if (attr.type === 'boolean') {
          defaultAttrs[attr.name] = false;
        } else if (attr.type === 'sizes') {
          defaultAttrs[attr.name] = [];
        } else {
          defaultAttrs[attr.name] = '';
        }
      });

      setAttributes(defaultAttrs);
    } catch (err) {
      console.error('Error loading template:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    if (mode === 'create' && !selectedTemplateId) {
      setError('Please select an attribute template');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saveData: any = {
        name,
        attributes,
        attribute_template_id: selectedTemplateId || currentProduct?.attribute_template_id,
      };

      if (currentProduct?.mapping_id) {
        saveData.mapping_id = currentProduct.mapping_id;
        saveData.integration_source_id = currentProduct.integration_source_id;
        saveData.integration_type = currentProduct.integration_type;
      }

      if (productId && mode === 'edit') {
        const { error: updateError } = await supabase
          .from('products')
          .update(saveData)
          .eq('id', productId);

        if (updateError) throw updateError;
        saveData.id = productId;
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([saveData])
          .select()
          .single();

        if (insertError) throw insertError;
        saveData.id = newProduct.id;
      }

      originalDataRef.current = { name, attributes };
      setIsDirty(false);
      onSave(saveData);
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleDiscardAndExit = () => {
    setShowExitConfirm(false);
    onBack();
  };

  const handleSaveAndExit = async () => {
    setShowExitConfirm(false);
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showExitConfirm) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, showExitConfirm]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const copyIdToClipboard = async () => {
    if (productId) {
      try {
        await navigator.clipboard.writeText(productId);
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const getSections = () => {
    const sections = [
      { id: 'basic-info', label: 'Basic Information', icon: Info },
    ];

    if (mode === 'edit') {
      sections.push({ id: 'api-integration', label: 'API Integration', icon: Link });
    }

    sections.push(
      { id: 'attributes', label: 'Product Attributes', icon: Tag },
      { id: 'images', label: 'Images', icon: ImageIcon },
      { id: 'options', label: 'Options', icon: List }
    );

    return sections;
  };

  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Product Management', onClick: onBack }
    ];

    if (mode === 'edit') {
      items.push({ label: 'Edit Product' });
    } else {
      items.push({ label: 'Create Product' });
    }

    return items;
  };

  const availableLanguages = () => {
    const langs = [{ code: 'en', name: 'English' }];
    if (template?.translations && Array.isArray(template.translations)) {
      template.translations.forEach((t: any) => {
        langs.push({ code: t.locale, name: t.locale_name });
      });
    }
    return langs;
  };

  const getFieldLabel = (fieldName: string): string => {
    if (currentLanguage === 'en') {
      const meta = getAttributeMeta(fieldName);
      return meta?.label || fieldName;
    }

    const translation = template?.translations?.find((t: any) => t.locale === currentLanguage);
    const translatedLabel = translation?.field_labels?.[fieldName];

    if (translatedLabel) {
      return translatedLabel;
    }

    const meta = getAttributeMeta(fieldName);
    return meta?.label || fieldName;
  };

  const getAttributeMeta = (attributeName: string): any => {
    if (!templateSchema) return null;

    const allAttrs = [
      ...(templateSchema.core_attributes || []),
      ...(templateSchema.extended_attributes || [])
    ];

    return allAttrs.find((attr: any) => attr.name === attributeName);
  };

  const updateAttribute = (key: string, value: any) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  const addAttribute = () => {
    const newKey = `custom_${Date.now()}`;
    setAttributes(prev => ({ ...prev, [newKey]: '' }));
  };

  const removeAttribute = (key: string) => {
    const newAttrs = { ...attributes };
    delete newAttrs[key];
    setAttributes(newAttrs);
  };

  const handleViewSource = async (sourceId: string) => {
    setViewingSourceId(sourceId);
  };

  const handleChangeLink = () => {
    setShowProductApiLinkModal(true);
  };

  const renderAttributeField = (key: string, value: any) => {
    const meta = getAttributeMeta(key);

    if (!meta) {
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => updateAttribute(key, e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      );
    }

    if (meta.type === 'richtext') {
      return (
        <div className="relative">
          {!expandedRichTextFields.has(key) ? (
            <>
              <input
                type="text"
                value={value ? value.replace(/<[^>]*>/g, '').substring(0, 100) : ''}
                readOnly
                onClick={() => {
                  const newExpanded = new Set(expandedRichTextFields);
                  newExpanded.add(key);
                  setExpandedRichTextFields(newExpanded);
                }}
                placeholder={`Enter ${getFieldLabel(key)}`}
                className="w-full px-3 py-2 pr-10 border border-slate-300 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const newExpanded = new Set(expandedRichTextFields);
                  newExpanded.add(key);
                  setExpandedRichTextFields(newExpanded);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                title="Expand rich text editor"
              >
                <FileText className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="border border-blue-500 rounded-lg p-3 bg-blue-50/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Editing {getFieldLabel(key)}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newExpanded = new Set(expandedRichTextFields);
                    newExpanded.delete(key);
                    setExpandedRichTextFields(newExpanded);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Collapse editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RichTextEditor
                value={value || ''}
                onChange={(newValue) => updateAttribute(key, newValue)}
                placeholder={`Enter ${getFieldLabel(key)}`}
                minHeight="200px"
              />
            </div>
          )}
        </div>
      );
    }

    if (meta.type === 'image') {
      return (
        <ImageUploadField
          value={value || ''}
          onChange={(newValue) => updateAttribute(key, newValue)}
          label={getFieldLabel(key)}
        />
      );
    }

    if (meta.type === 'sizes') {
      return (
        <OptionsEditor
          options={Array.isArray(value) ? value : []}
          onChange={(newOptions) => updateAttribute(key, newOptions)}
          integrationSourceId={currentProduct?.integration_source_id}
          expandedRichTextFields={expandedRichTextFields}
          setExpandedRichTextFields={setExpandedRichTextFields}
        />
      );
    }

    if (meta.type === 'boolean') {
      const boolValue = value === true || value === 'true';
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateAttribute(key, !boolValue)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              boolValue ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                boolValue ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      );
    }

    if (meta.type === 'multiselect') {
      return (
        <select
          multiple
          value={Array.isArray(value) ? value : []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            updateAttribute(key, selected);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          {meta.options?.map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    if (meta.type === 'select') {
      return (
        <select
          value={value || ''}
          onChange={(e) => updateAttribute(key, e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">Select...</option>
          {meta.options?.map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={meta.type === 'number' ? 'number' : 'text'}
        value={value || ''}
        onChange={(e) => updateAttribute(key, e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        placeholder={`Enter ${getFieldLabel(key)}`}
      />
    );
  };

  const getCoreAttributes = () => {
    if (!templateSchema) return [];
    return Object.keys(attributes).filter(key => {
      const meta = getAttributeMeta(key);
      return meta && templateSchema.core_attributes?.some((attr: any) => attr.name === key);
    });
  };

  const getImageAttributes = () => {
    if (!templateSchema) return [];
    return Object.keys(attributes).filter(key => {
      const meta = getAttributeMeta(key);
      return meta?.type === 'image';
    });
  };

  const getOptionsAttributes = () => {
    if (!templateSchema) return [];
    return Object.keys(attributes).filter(key => {
      const meta = getAttributeMeta(key);
      return meta?.type === 'sizes';
    });
  };

  if (loading && mode === 'edit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Unsaved Changes
                  </h3>
                  <p className="text-slate-600 text-sm">
                    You have unsaved changes. What would you like to do?
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscardAndExit}
                className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSaveAndExit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <Breadcrumb items={getBreadcrumbItems()} className="mb-0" />
              <div className="flex items-center gap-3">
                {availableLanguages().length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowLocaleDropdown(!showLocaleDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                    >
                      <Globe className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">
                        {availableLanguages().find(l => l.code === currentLanguage)?.name || 'English'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    </button>
                    {showLocaleDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-[70] overflow-hidden">
                        {availableLanguages().map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setCurrentLanguage(lang.code);
                              setShowLocaleDropdown(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
                              currentLanguage === lang.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                            }`}
                          >
                            <span>{lang.name}</span>
                            {currentLanguage === lang.code && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {productId && (
                  <button
                    onClick={copyIdToClipboard}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-xs font-mono border border-slate-300"
                    title="Click to copy ID"
                  >
                    {idCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ID: {productId}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">
                  {mode === 'create' ? 'Create Product' : 'Edit Product'}
                </h1>
                {mode === 'edit' && policyViolations.length > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg shadow-sm text-xs font-medium text-amber-800">
                    <AlertCircle className="w-4 h-4" />
                    {policyViolations.length} Policy Violation{policyViolations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600">
                {mode === 'create'
                  ? 'Create a new product with attributes and options'
                  : 'Update product details, attributes, and options'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {policyViolations.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 mb-2">Policy Violations Detected</h3>
                  <div className="space-y-2">
                    {policyViolations.map((violation: any, idx: number) => (
                      <div key={idx} className="text-sm text-amber-800">
                        <span className="font-medium">{violation.product_policies?.display_name}:</span>{' '}
                        {violation.violation_details?.message || 'Policy violation detected'}
                        {violation.violation_details?.missing_fields && violation.violation_details.missing_fields.length > 0 && (
                          <span className="ml-1 text-amber-700">
                            (Missing: {violation.violation_details.missing_fields.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentLanguage !== 'en' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Editing {availableLanguages().find(l => l.code === currentLanguage)?.name} translation
                </span>
              </div>
              <span className="text-xs text-blue-700">
                Non-translatable fields show default values
              </span>
            </div>
          )}

          <div className="flex gap-8">
            <aside className="w-64 flex-shrink-0">
              <div className="sticky top-[124px] z-10 bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">
                  Sections
                </h3>
                <nav className="space-y-1">
                  {getSections().map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeSection === section.id
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 -ml-px pl-2.5'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-left">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <form onSubmit={handleSubmit} className="flex-1 space-y-8">
              <div
                id="basic-info"
                ref={(el) => (sectionRefs.current['basic-info'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>

                {mode === 'create' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Product Attribute Template *
                    </label>
                    <select
                      required
                      value={selectedTemplateId}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        loadTemplateForCreate(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a template...</option>
                      {availableTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} - {template.description}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Defines the shape and attributes of your product
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Classic Burger"
                  />
                </div>
              </div>

              {mode === 'edit' && (
                <div
                  id="api-integration"
                  ref={(el) => (sectionRefs.current['api-integration'] = el)}
                  className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
                >
                  <ApiIntegrationSection
                    mode={mode}
                    linkedSources={linkedSources}
                    viewingSourceId={viewingSourceId}
                    currentItem={currentProduct}
                    onViewSource={handleViewSource}
                    onChangeLink={handleChangeLink}
                    onUnlink={async () => {
                      if (currentProduct?.id) {
                        try {
                          await integrationLinkService.unlinkProduct(currentProduct.id);
                          alert('Product unlinked from API');
                          loadData();
                        } catch (error: any) {
                          alert(error.message);
                        }
                      }
                    }}
                    onClearCurrent={() => setCurrentProduct(null)}
                    onLinkNew={() => setShowProductApiLinkModal(true)}
                  />
                </div>
              )}

              <div
                id="attributes"
                ref={(el) => (sectionRefs.current['attributes'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Product Attributes</h2>
                  {(!currentProduct || !currentProduct.integration_product_id) && (
                    <button
                      type="button"
                      onClick={addAttribute}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add Attribute
                    </button>
                  )}
                </div>

                {getCoreAttributes().length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No attributes yet. {mode === 'create' ? 'Select a template to get started.' : 'Click "Add Attribute" to get started.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {getCoreAttributes().map((key) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            {getFieldLabel(key)}
                          </label>
                          {!getAttributeMeta(key) && (
                            <button
                              type="button"
                              onClick={() => removeAttribute(key)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {renderAttributeField(key, attributes[key])}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                id="images"
                ref={(el) => (sectionRefs.current['images'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Images</h2>
                {getImageAttributes().length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No image fields defined in template
                  </p>
                ) : (
                  <div className="space-y-4">
                    {getImageAttributes().map((key) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {getFieldLabel(key)}
                        </label>
                        {renderAttributeField(key, attributes[key])}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                id="options"
                ref={(el) => (sectionRefs.current['options'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Options</h2>
                {getOptionsAttributes().length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No option fields defined in template
                  </p>
                ) : (
                  <div className="space-y-6">
                    {getOptionsAttributes().map((key) => (
                      <div key={key}>
                        {renderAttributeField(key, attributes[key])}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isDirty && (
                <div className="sticky bottom-0 bg-white rounded-lg border border-slate-200 p-6 shadow-lg transition-all duration-300 ease-in-out">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {mode === 'create' ? 'Create Product' : 'Update Product'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {showProductApiLinkModal && (
        <ApiLinkModal
          isOpen={showProductApiLinkModal}
          onClose={() => setShowProductApiLinkModal(false)}
          onLink={async (mapping_id, integration_type) => {
            if (mode === 'create') {
              setCurrentProduct({
                id: '',
                name: name,
                attributes: attributes,
                attribute_template_id: selectedTemplateId,
                display_template_id: null,
                integration_product_id: null,
                mapping_id: mapping_id,
                integration_source_id: location?.active_integration_source_id || null,
                integration_type: integration_type,
              });
            } else if (productId) {
              try {
                await integrationLinkService.linkProduct(
                  productId,
                  mapping_id,
                  location?.active_integration_source_id || '',
                  integration_type
                );
                alert('Product linked successfully');
                loadData();
              } catch (error: any) {
                alert(error.message);
              }
            }
            setShowProductApiLinkModal(false);
          }}
          integrationSourceId={location?.active_integration_source_id || null}
          title="Link Product to API"
          searchType="all"
        />
      )}

      {showPriceCaloriesLinkModal && linkingFieldKey && (
        <FieldLinkModal
          isOpen={showPriceCaloriesLinkModal}
          onClose={() => {
            setShowPriceCaloriesLinkModal(false);
            setLinkingFieldKey(null);
          }}
          onLink={(linkData) => {
            if (linkingFieldKey) {
              const newFieldLinks = {
                ...fieldLinks,
                [linkingFieldKey]: linkData
              };
              setFieldLinks(newFieldLinks);

              if (linkData.type === 'calculation' && linkData.calculation) {
                let total = 0;
                for (const part of linkData.calculation) {
                  const value = typeof part.value === 'number' ? part.value : parseFloat(part.value) || 0;
                  if (part.operation === 'subtract') {
                    total -= value;
                  } else {
                    total += value;
                  }
                }
                updateAttribute(linkingFieldKey, total.toFixed(2));
              }
            }
            setShowPriceCaloriesLinkModal(false);
            setLinkingFieldKey(null);
          }}
          fieldName={linkingFieldKey}
          fieldLabel={linkingFieldKey === 'price' ? 'Price' : 'Calories'}
          currentLink={linkingFieldKey ? fieldLinks[linkingFieldKey] : null}
        />
      )}
    </>
  );
}
