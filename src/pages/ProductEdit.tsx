import { useState, useEffect, useRef } from 'react';
import { Save, AlertCircle, Info, Tag, Image, List, Copy, Check, Globe, ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Breadcrumb from '../components/Breadcrumb';

interface ProductData {
  id?: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  attribute_overrides?: Record<string, boolean>;
  attribute_mappings?: Record<string, any>;
  disabled_sync_fields?: string[];
  active_integration_source_id?: string;
  last_sync_metadata?: Record<string, any>;
  mapping_id?: string | null;
  integration_source_id?: string | null;
  integration_type?: 'product' | 'modifier' | 'discount' | null;
  local_fields?: string[];
  price_calculations?: Record<string, any>;
  last_synced_at?: string | null;
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
  price_calculation?: any;
}

export default function ProductEdit({ productId, mode, onBack, onSave }: ProductEditProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProductData>({
    name: '',
    attributes: {},
    attribute_template_id: null,
    display_template_id: null,
    integration_product_id: null,
    local_fields: [],
  });

  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [policyViolations, setPolicyViolations] = useState<any[]>([]);

  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showLocaleDropdown, setShowLocaleDropdown] = useState(false);

  const [activeSection, setActiveSection] = useState('basic-info');
  const [idCopied, setIdCopied] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const originalDataRef = useRef<ProductData | null>(null);

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
      return mode === 'create' ? false : true;
    }

    return JSON.stringify({ ...formData, attributes }) !== JSON.stringify({ ...originalDataRef.current, attributes: originalDataRef.current.attributes });
  };

  useEffect(() => {
    setIsDirty(checkIfDirty());
  }, [formData, attributes]);

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
          setFormData(data);
          setAttributes(data.attributes || {});
          setSelectedTemplateId(data.attribute_template_id || '');
          originalDataRef.current = { ...data, attributes: data.attributes || {} };

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
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
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
      const saveData = {
        ...formData,
        attributes,
        attribute_template_id: selectedTemplateId || formData.attribute_template_id,
      };

      if (productId && mode === 'edit') {
        const { error: updateError } = await supabase
          .from('products')
          .update(saveData)
          .eq('id', productId);

        if (updateError) throw updateError;
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([saveData])
          .select()
          .single();

        if (insertError) throw insertError;
        saveData.id = newProduct.id;
      }

      originalDataRef.current = { ...saveData };
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
      { id: 'attributes', label: 'Product Attributes', icon: Tag },
      { id: 'images', label: 'Image Attributes', icon: Image },
      { id: 'options', label: 'Options', icon: List },
    ];

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
    return [
      { code: 'en', name: 'English' },
      { code: 'fr-CA', name: 'French (Canada)' },
      { code: 'es', name: 'Spanish' },
    ];
  };

  const addAttribute = () => {
    const newKey = `custom_${Date.now()}`;
    setAttributes({ ...attributes, [newKey]: { value: '', type: 'text' } });
  };

  const updateAttribute = (key: string, value: any) => {
    setAttributes({ ...attributes, [key]: value });
  };

  const removeAttribute = (key: string) => {
    const newAttrs = { ...attributes };
    delete newAttrs[key];
    setAttributes(newAttrs);
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
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
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
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Classic Burger"
                  />
                </div>
              </div>

              <div
                id="attributes"
                ref={(el) => (sectionRefs.current['attributes'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Product Attributes</h2>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Attribute
                  </button>
                </div>

                {Object.keys(attributes).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No attributes yet. Click "Add Attribute" to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(attributes).map(([key, value]) => (
                      <div key={key} className="flex gap-3 items-start p-4 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newAttrs = { ...attributes };
                              delete newAttrs[key];
                              newAttrs[e.target.value] = value;
                              setAttributes(newAttrs);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                            placeholder="Attribute name"
                          />
                          <input
                            type="text"
                            value={typeof value === 'object' && value !== null ? value.value || '' : value}
                            onChange={(e) => updateAttribute(key, { value: e.target.value, type: 'text' })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Attribute value"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttribute(key)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <X className="w-5 h-5" />
                        </button>
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
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Image Attributes</h2>
                <p className="text-sm text-slate-500 text-center py-4">
                  Image upload functionality will be added here
                </p>
              </div>

              <div
                id="options"
                ref={(el) => (sectionRefs.current['options'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Options</h2>
                <p className="text-sm text-slate-500 text-center py-4">
                  Options management will be added here
                </p>
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
    </>
  );
}
