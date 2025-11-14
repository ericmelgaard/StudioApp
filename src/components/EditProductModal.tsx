import { useState, useEffect, memo } from 'react';
import { X, Save, Trash2, RotateCcw, Link, Unlink, ChevronDown, Plus, Calendar, Clock, Calculator, Globe, Check, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUploadField from './ImageUploadField';
import RichTextEditor from './RichTextEditor';
import FieldLinkModal, { FieldLinkData } from './FieldLinkModal';
import TranslationEditor from './TranslationEditor';
import SyncBadge from './SyncBadge';
import { SyncStateManager, ProductSyncState } from '../lib/syncStateManager';
import { StateBadge, FieldBadgeGroup } from './StateBadge';
import ApiLinkModal from './ApiLinkModal';
import { productValueResolver } from '../lib/productValueResolver';
import { integrationLinkService } from '../lib/integrationLinkService';
import { LocationProductService } from '../lib/locationProductService';
import { useLocation } from '../hooks/useLocation';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  attribute_overrides?: Record<string, boolean>;
  attribute_mappings?: Record<string, FieldLinkData>;
  integration_source_name?: string;
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

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

interface SyncStatus {
  synced: Record<string, any>;
  overridden: Record<string, any>;
  localOnly: Record<string, any>;
}

interface Option {
  id: string;
  label: string;
  price: number;
  is_active: boolean;
  is_out_of_stock: boolean;
  link?: FieldLinkData;
}

interface OptionsEditorProps {
  options: Option[];
  onChange: (options: Option[]) => void;
}

const OptionsEditor = memo(function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingOptionId, setLinkingOptionId] = useState<string | null>(null);
  const [currentLink, setCurrentLink] = useState<FieldLinkData | null>(null);
  const addOption = () => {
    const newOption: Option = {
      id: crypto.randomUUID(),
      label: '',
      price: 0,
      is_active: true,
      is_out_of_stock: false,
    };
    onChange([...options, newOption]);
  };

  const updateOption = (id: string, updates: Partial<Option>) => {
    onChange(options.map(option => option.id === id ? { ...option, ...updates } : option));
  };

  const openLinkModal = (optionId: string) => {
    const option = options.find(o => o.id === optionId);
    setLinkingOptionId(optionId);
    setCurrentLink(option?.link || null);
    setShowLinkModal(true);
  };

  const handleLink = (linkData: FieldLinkData) => {
    if (linkingOptionId) {
      updateOption(linkingOptionId, { link: linkData });
    }
  };

  const handleUnlink = (optionId: string) => {
    updateOption(optionId, { link: undefined });
  };

  const removeOption = (id: string) => {
    onChange(options.filter(option => option.id !== id));
  };

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <div key={option.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <input
              type="text"
              value={option.label}
              onChange={(e) => updateOption(option.id, { label: e.target.value })}
              placeholder="Option label (e.g., Small)"
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={!!option.link}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={option.price}
                onChange={(e) => updateOption(option.id, { price: parseFloat(e.target.value) || 0 })}
                disabled={!!option.link}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              />
              {option.link && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Linked</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">Active</span>
              <button
                onClick={() => updateOption(option.id, { is_active: !option.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  option.is_active ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    option.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">Out of Stock</span>
              <button
                onClick={() => updateOption(option.id, { is_out_of_stock: !option.is_out_of_stock })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  option.is_out_of_stock ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    option.is_out_of_stock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {option.link ? (
              <button
                onClick={() => handleUnlink(option.id)}
                className="p-2 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                title="Linked to integration product"
              >
                <Unlink className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => openLinkModal(option.id)}
                className="p-2 rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                title="Link to integration product"
              >
                <Link className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => removeOption(option.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addOption}
        className="w-full py-2.5 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Option
      </button>

      <FieldLinkModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setLinkingOptionId(null);
          setCurrentLink(null);
        }}
        onLink={handleLink}
        fieldName="price"
        fieldLabel="Option Price"
        currentLink={currentLink}
      />
    </div>
  );
});

export default function EditProductModal({ isOpen, onClose, product, onSuccess }: EditProductModalProps) {
  const { location } = useLocation();
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [attributeOverrides, setAttributeOverrides] = useState<Record<string, boolean>>({});
  const [attributeMappings, setAttributeMappings] = useState<Record<string, string>>({});
  const [fieldLinks, setFieldLinks] = useState<Record<string, FieldLinkData>>({});
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [integrationData, setIntegrationData] = useState<any>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [showLocaleDropdown, setShowLocaleDropdown] = useState(false);
  const [templateAttributes, setTemplateAttributes] = useState<string[]>([]);
  const [templateSchema, setTemplateSchema] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingAttributeKey, setMappingAttributeKey] = useState<string | null>(null);
  const [pendingPublication, setPendingPublication] = useState<any>(null);
  const [editMode, setEditMode] = useState<'immediate' | 'scheduled' | null>(null);
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [showEditChoice, setShowEditChoice] = useState(false);
  const [showPriceCaloriesLinkModal, setShowPriceCaloriesLinkModal] = useState(false);
  const [linkingFieldKey, setLinkingFieldKey] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [translationData, setTranslationData] = useState<Record<string, Record<string, any>>>({});
  const [policyViolations, setPolicyViolations] = useState<any[]>([]);
  const [syncStateManager, setSyncStateManager] = useState<SyncStateManager | null>(null);
  const [disabledSyncFields, setDisabledSyncFields] = useState<string[]>([]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Get available languages from template
  const availableLanguages = () => {
    const langs = [{ code: 'en', name: 'English' }];
    if (template?.translations && Array.isArray(template.translations)) {
      template.translations.forEach((t: any) => {
        langs.push({ code: t.locale, name: t.locale_name });
      });
    }
    return langs;
  };

  // Get translated field label
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

  // Check if a field is translatable
  const isFieldTranslatable = (fieldName: string): boolean => {
    if (!templateSchema) return false;
    const allAttrs = [...(templateSchema.core_attributes || []), ...(templateSchema.extended_attributes || [])];
    const attr = allAttrs.find((a: any) => a.name === fieldName);
    return attr && (attr.type === 'text' || attr.type === 'number' || attr.type === 'richtext');
  };

  // Get translation status for a field
  const getTranslationStatus = (fieldName: string): 'complete' | 'missing' | null => {
    if (currentLanguage === 'en' || !isFieldTranslatable(fieldName)) return null;
    const translationKey = `translations_${currentLanguage.replace('-', '_').toLowerCase()}`;
    const value = translationData[translationKey]?.[fieldName];
    const hasValue = value !== undefined && value !== null && value !== '';
    const isRequired = ['name', 'description'].includes(fieldName);
    if (!hasValue && isRequired) return 'missing';
    if (hasValue) return 'complete';
    return null;
  };

  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
      setName(product.name);
      loadTemplateAttributes();
      setAttributeOverrides(product.attribute_overrides || {});
      const prodAttrMappings = (product as any).attribute_mappings || {};
      setAttributeMappings(prodAttrMappings);
      const mappings = product.attribute_mappings || {};
      setFieldLinks(mappings);
      setTranslations(product.attributes?.translations || {});
      setDisabledSyncFields(product.disabled_sync_fields || []);

      // Load translation data from attributes
      const translations: Record<string, Record<string, any>> = {};
      Object.keys(product.attributes || {}).forEach(key => {
        if (key.startsWith('translations_')) {
          translations[key] = product.attributes[key] || {};
        }
      });
      setTranslationData(translations);

      // Initialize sync state manager
      initializeSyncStateManager();

      loadIntegrationData();
      checkPendingPublication();
      loadPolicyViolations();

      // Calculate any computed fields
      calculateComputedFields(mappings, product.attributes);
    }
  }, [product]);

  function calculateComputedFields(mappings: Record<string, FieldLinkData>, attrs: Record<string, any>) {
    const updatedAttrs = { ...attrs };
    let hasChanges = false;

    for (const [key, linkData] of Object.entries(mappings)) {
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
        if (updatedAttrs[key] !== total.toFixed(2)) {
          updatedAttrs[key] = total.toFixed(2);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setAttributes(updatedAttrs);
    }
  }

  async function initializeSyncStateManager() {
    if (!product) return;

    // Load integration sources
    const integrationSources = [];
    if (product.active_integration_source_id) {
      integrationSources.push({
        id: product.active_integration_source_id,
        name: product.integration_source_name || 'Integration',
        isActive: true,
        priority: 1
      });
    }

    const productSyncState: ProductSyncState = {
      integrationProductId: product.integration_product_id || undefined,
      integrationSourceId: product.active_integration_source_id,
      integrationSourceName: product.integration_source_name,
      isLinked: !!product.integration_product_id,
      hasActiveMappings: Object.keys(product.attribute_mappings || {}).length > 0,
      attributeMappings: product.attribute_mappings,
      attributeOverrides: product.attribute_overrides,
      disabledSyncFields: product.disabled_sync_fields || []
    };

    const manager = new SyncStateManager(productSyncState, integrationSources, {});
    setSyncStateManager(manager);
  }

  async function checkPendingPublication() {
    if (!product) return;

    const { data } = await supabase
      .from('product_publications')
      .select('*')
      .eq('product_id', product.id)
      .in('status', ['draft', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setPendingPublication(data);
      setShowEditChoice(true);
    } else {
      setPendingPublication(null);
      setEditMode(null);
    }
  }

  async function loadPolicyViolations() {
    if (!product) return;

    const { data } = await supabase
      .from('product_policy_evaluations')
      .select(`
        id,
        status,
        violation_details,
        product_policies (
          display_name,
          severity,
          description
        )
      `)
      .eq('product_id', product.id)
      .eq('status', 'violation');

    setPolicyViolations(data || []);
  }

  async function loadTemplateAttributes() {
    if (!product) return;

    // Start with actual product attributes
    const productAttrs = product.attributes || {};

    // If product has a template, fetch and merge template attributes
    if (product.attribute_template_id) {
      try {
        const { data: templateData } = await supabase
          .from('product_attribute_templates')
          .select('*')
          .eq('id', product.attribute_template_id)
          .maybeSingle();

        if (templateData?.attribute_schema) {
          setTemplate(templateData);
          const schema = templateData.attribute_schema as any;
          setTemplateSchema(schema);

          const coreAttrs = schema.core_attributes || [];
          const extendedAttrs = schema.extended_attributes || [];
          const allTemplateAttrs = [...coreAttrs, ...extendedAttrs];

          // Store list of template attribute names
          setTemplateAttributes(allTemplateAttrs.map((attr: any) => attr.name));

          // Merge template attributes with existing product attributes
          const mergedAttributes = { ...productAttrs };

          // Special handling for 'name' - use top-level product.name if attributes.name doesn't exist
          if (!mergedAttributes.name && product.name) {
            mergedAttributes.name = product.name;
          }

          allTemplateAttrs.forEach((attr: any) => {
            if (!(attr.name in mergedAttributes)) {
              // Initialize with appropriate default based on type
              if (attr.type === 'sizes') {
                mergedAttributes[attr.name] = [];
              } else if (attr.type === 'boolean') {
                mergedAttributes[attr.name] = false;
              } else if (attr.type === 'number') {
                mergedAttributes[attr.name] = null;
              } else {
                mergedAttributes[attr.name] = '';
              }
            }
          });

          // Initialize translation attributes if template has translations
          if (templateData.translations && Array.isArray(templateData.translations)) {
            templateData.translations.forEach((translation: any) => {
              const translationKey = `translations_${translation.locale.replace('-', '_').toLowerCase()}`;
              if (!(translationKey in mergedAttributes)) {
                mergedAttributes[translationKey] = {};
              }
            });
          }

          setAttributes(mergedAttributes);

          // Load translation data
          const translations: Record<string, Record<string, any>> = {};
          if (templateData.translations && Array.isArray(templateData.translations)) {
            templateData.translations.forEach((translation: any) => {
              const translationKey = `translations_${translation.locale.replace('-', '_').toLowerCase()}`;
              translations[translationKey] = mergedAttributes[translationKey] || {};
            });
          }
          setTranslationData(translations);

          return;
        }
      } catch (error) {
        console.error('Error loading template:', error);
      }
    }

    // No template or error - just use product attributes
    // Make sure name is populated from top-level if not in attributes
    const finalAttrs = { ...productAttrs };
    if (!finalAttrs.name && product.name) {
      finalAttrs.name = product.name;
    }
    setAttributes(finalAttrs);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside a dropdown
      if (target.closest('.dropdown-menu')) {
        return;
      }
      setOpenDropdown(null);
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  async function loadIntegrationData() {
    // Support both old and new linking systems
    const hasNewLink = product?.mapping_id && product?.integration_source_id;
    const hasOldLink = product?.integration_product_id;

    if (!hasNewLink && !hasOldLink) {
      setSyncStatus(null);
      setIntegrationData(null);
      return;
    }

    try {
      let integrationProduct = null;

      // New system: use mapping_id and integration_source_id
      if (hasNewLink) {
        const tableName = product.integration_type === 'product'
          ? 'integration_products'
          : product.integration_type === 'modifier'
          ? 'integration_modifiers'
          : 'integration_discounts';

        const { data } = await supabase
          .from(tableName)
          .select('data, wand_source_id')
          .eq('mapping_id', product.mapping_id)
          .eq('wand_source_id', product.integration_source_id)
          .maybeSingle();

        if (data) {
          integrationProduct = { data: data.data, source_id: data.wand_source_id };
        }
      }
      // Old system: use integration_product_id
      else if (hasOldLink) {
        const { data } = await supabase
          .from('integration_products')
          .select('data, source_id')
          .eq('id', product.integration_product_id)
          .maybeSingle();

        if (data) {
          integrationProduct = data;
        }
      }

      if (!integrationProduct) {
        setIntegrationData(null);
        return;
      }

      setIntegrationData(integrationProduct.data);

      const { data: mappingData } = await supabase
        .from('integration_attribute_mappings')
        .select('attribute_mappings')
        .eq('source_id', integrationProduct.source_id)
        .eq('is_template', true)
        .maybeSingle();

      if (!mappingData) return;

      const mappings = mappingData.attribute_mappings?.mappings || [];
      const syncedAttrs: Record<string, any> = {};
      const overriddenAttrs: Record<string, any> = {};
      const localOnlyAttrs: Record<string, any> = {};

      const currentAttributes = product.attributes || {};
      const overrides = product.attribute_overrides || {};
      const productMappings = (product as any).attribute_mappings || {};

      for (const key of Object.keys(currentAttributes)) {
        // Check for product-level mapping first
        const productMapping = productMappings[key];

        // Then check for template-level mapping
        const templateMapping = mappings.find((m: any) => m.wand_field === key);

        // Only track sync status for product-level mappings, not template mappings
        // Template mappings are just defaults used during import
        if (productMapping) {
          const integrationValue = getNestedValue(integrationProduct.data,
            typeof productMapping === 'string' ? productMapping : productMapping);
          const currentValue = currentAttributes[key];

          // Check if this attribute is marked as overridden
          if (overrides[key]) {
            overriddenAttrs[key] = {
              current: currentValue,
              integration: integrationValue
            };
          } else if (JSON.stringify(integrationValue) === JSON.stringify(currentValue)) {
            syncedAttrs[key] = currentValue;
          } else {
            // Value differs but not marked as override - treat as synced with different value
            overriddenAttrs[key] = {
              current: currentValue,
              integration: integrationValue
            };
          }
        } else {
          localOnlyAttrs[key] = currentAttributes[key];
        }
      }

      setSyncStatus({
        synced: syncedAttrs,
        overridden: overriddenAttrs,
        localOnly: localOnlyAttrs
      });
    } catch (error) {
      console.error('Error loading integration data:', error);
    }
  }

  function getNestedValue(obj: any, path: string): any {
    try {
      const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      let value = obj;
      for (const part of parts) {
        value = value?.[part];
      }
      return value;
    } catch {
      return undefined;
    }
  }

  async function handlePublish(publishAt?: string) {
    if (!product) return;

    setLoading(true);
    try {
      // Merge translation data back into attributes
      const updatedAttributes = {
        ...attributes,
        ...translationData
      };

      // Use attributes.name if it exists, otherwise fall back to the name state
      const productName = updatedAttributes.name || name;

      const changes = {
        name: productName,
        attributes: updatedAttributes,
        attribute_overrides: attributeOverrides,
        attribute_mappings: fieldLinks,
        disabled_sync_fields: disabledSyncFields,
      };

      if (editMode === 'scheduled' && pendingPublication) {
        // Editing existing scheduled publication
        const { error } = await supabase
          .from('product_publications')
          .update({
            changes: changes,
            updated_at: new Date().toISOString()
          })
          .eq('id', pendingPublication.id);

        if (error) throw error;
        alert('Scheduled publication updated successfully');
      } else if (publishAt) {
        // Creating new scheduled publication
        // Cancel any existing pending publications
        if (pendingPublication) {
          await supabase
            .from('product_publications')
            .update({ status: 'cancelled' })
            .eq('id', pendingPublication.id);
        }

        const { error } = await supabase
          .from('product_publications')
          .insert({
            product_id: product.id,
            status: 'scheduled',
            publish_at: publishAt,
            changes: changes,
          });

        if (error) throw error;
        alert('Publication scheduled successfully');
      } else {
        // Immediate publish
        // Cancel any existing pending publications
        if (pendingPublication) {
          await supabase
            .from('product_publications')
            .update({ status: 'cancelled' })
            .eq('id', pendingPublication.id);
        }

        // Update product immediately
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...changes,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);

        if (updateError) throw updateError;

        // Record as published
        await supabase
          .from('product_publications')
          .insert({
            product_id: product.id,
            status: 'published',
            published_at: new Date().toISOString(),
            changes: changes,
          });

        alert('Product published successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error publishing product:', error);
      alert('Failed to publish product');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!product) return;

    const confirmed = confirm(`Are you sure you want to delete "${product.name}"?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      alert('Product deleted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  }

  function updateAttribute(key: string, value: any) {
    if (currentLanguage === 'en') {
      // Update base attributes
      setAttributes(prev => ({
        ...prev,
        [key]: value
      }));
    } else {
      // Update translation data
      const translationKey = `translations_${currentLanguage.replace('-', '_').toLowerCase()}`;
      setTranslationData(prev => ({
        ...prev,
        [translationKey]: {
          ...(prev[translationKey] || {}),
          [key]: value
        }
      }));
    }
  }

  function getAttributeValue(key: string): any {
    if (currentLanguage === 'en') {
      return attributes[key];
    } else {
      const translationKey = `translations_${currentLanguage.replace('-', '_').toLowerCase()}`;
      return translationData[translationKey]?.[key];
    }
  }

  function addAttribute() {
    const key = prompt('Enter attribute name:');
    if (!key) return;

    if (attributes[key] !== undefined) {
      alert('Attribute already exists');
      return;
    }

    updateAttribute(key, '');
  }

  function enableSync(key: string) {
    if (!syncStatus?.overridden[key]) return;

    // Update the attribute to match integration value
    updateAttribute(key, syncStatus.overridden[key].integration);

    // Remove from overrides to allow syncing
    const newOverrides = { ...attributeOverrides };
    delete newOverrides[key];
    setAttributeOverrides(newOverrides);
  }

  function lockOverride(key: string) {
    // Mark this attribute as overridden so it won't sync
    setAttributeOverrides(prev => ({
      ...prev,
      [key]: true
    }));
  }

  function getAttributeMeta(key: string) {
    if (!templateSchema) return null;

    const coreAttrs = templateSchema.core_attributes || [];
    const extendedAttrs = templateSchema.extended_attributes || [];
    const allAttrs = [...coreAttrs, ...extendedAttrs];

    return allAttrs.find((attr: any) => attr.name === key);
  }

  function openMappingModal(key: string) {
    setMappingAttributeKey(key);
    setShowMappingModal(true);
  }

  function handleSetMapping(integrationPath: string) {
    if (!mappingAttributeKey) return;

    setAttributeMappings(prev => ({
      ...prev,
      [mappingAttributeKey]: integrationPath
    }));

    // Update the attribute value from integration data
    if (integrationData) {
      const value = getNestedValue(integrationData, integrationPath);
      updateAttribute(mappingAttributeKey, value);
    }

    setShowMappingModal(false);
    setMappingAttributeKey(null);
  }

  function removeMapping(key: string) {
    setAttributeMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[key];
      return newMappings;
    });
  }

  function handleToggleSync(fieldName: string) {
    if (!syncStateManager) return;

    const isSyncDisabled = disabledSyncFields.includes(fieldName);

    if (isSyncDisabled) {
      const newDisabledFields = disabledSyncFields.filter(f => f !== fieldName);
      setDisabledSyncFields(newDisabledFields);

      const newOverrides = { ...attributeOverrides };
      delete newOverrides[fieldName];
      setAttributeOverrides(newOverrides);
    } else {
      setDisabledSyncFields([...disabledSyncFields, fieldName]);
      setAttributeOverrides({
        ...attributeOverrides,
        [fieldName]: true
      });
    }
  }

  function handleRevertToSync(fieldName: string) {
    if (!syncStateManager || !integrationData) return;

    const mapping = fieldLinks[fieldName];
    if (mapping && mapping.type === 'direct' && mapping.directLink) {
      const syncedValue = getNestedValue(integrationData, mapping.directLink.field);
      if (syncedValue !== undefined) {
        updateAttribute(fieldName, syncedValue);
      }
    }

    const newDisabledFields = disabledSyncFields.filter(f => f !== fieldName);
    setDisabledSyncFields(newDisabledFields);

    const newOverrides = { ...attributeOverrides };
    delete newOverrides[fieldName];
    setAttributeOverrides(newOverrides);
  }

  function isAttributeInCoreSchema(key: string): boolean {
    // Check if attribute is in the template's core_attributes
    if (!templateSchema) return false;
    const coreAttrs = templateSchema.core_attributes || [];
    return coreAttrs.some((attr: any) => attr.name === key);
  }

  function canMapAttribute(key: string): boolean {
    // Can only map if there's integration data available
    if (!integrationData || !product?.integration_product_id) return false;

    // Check if attribute type is mappable (not complex objects or arrays except for specific types)
    const meta = getAttributeMeta(key);
    if (meta?.type === 'sizes') return false; // Options have their own linking mechanism

    return true;
  }

  function renderAttributeField(key: string, actualValue: any, syncStatus: SyncStatus | null, isOverridden: any, isLocalOnly: boolean) {
    const meta = getAttributeMeta(key);
    const isTranslatable = isFieldTranslatable(key);
    const isTranslationView = currentLanguage !== 'en';
    const isDisabled = isTranslationView && !isTranslatable;

    // For translation view, use translation value if available, otherwise show English as placeholder
    const displayValue = isTranslationView && isTranslatable ? getAttributeValue(key) : actualValue;
    const englishValue = attributes[key];

    if (meta?.type === 'image') {
      return (
        <div className="relative">
          <ImageUploadField
            value={isDisabled ? englishValue : (displayValue || '')}
            onChange={(newValue) => {
              if (!isDisabled) {
                updateAttribute(key, newValue);
                if (syncStatus && !isLocalOnly && !isOverridden) {
                  lockOverride(key);
                }
              }
            }}
            label={getFieldLabel(key)}
          />
          {isDisabled && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs text-slate-600">
              <Lock className="w-3 h-3" />
              Uses default
            </div>
          )}
        </div>
      );
    }

    if (meta?.type === 'richtext') {
      return (
        <div className="relative">
          <RichTextEditor
            value={displayValue || ''}
            onChange={(newValue) => {
              if (!isDisabled) {
                updateAttribute(key, newValue);
                if (syncStatus && !isLocalOnly && !isOverridden) {
                  lockOverride(key);
                }
              }
            }}
            placeholder={isTranslationView && isTranslatable ? `Enter ${currentLanguage} translation` : `Enter ${getFieldLabel(key)}`}
            minHeight={meta.minHeight || '120px'}
          />
          {isDisabled && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs text-slate-600">
              <Lock className="w-3 h-3" />
              Uses default
            </div>
          )}
        </div>
      );
    }

    if (meta?.type === 'sizes') {
      return (
        <OptionsEditor
          options={Array.isArray(actualValue) ? actualValue : []}
          onChange={(newOptions) => {
            updateAttribute(key, newOptions);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
        />
      );
    }

    if (meta?.type === 'translation') {
      return (
        <TranslationEditor
          value={actualValue || {}}
          onChange={(newValue) => {
            updateAttribute(key, newValue);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
          locale={meta.locale || 'Unknown'}
          sourceAttributes={attributes}
          templateSchema={templateSchema}
        />
      );
    }

    if (meta?.type === 'boolean') {
      const boolValue = (isDisabled ? englishValue : displayValue) === true || (isDisabled ? englishValue : displayValue) === 'true';
      return (
        <div className="flex items-center gap-2">
          <button
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return;
              const newValue = !boolValue;
            updateAttribute(key, newValue);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            boolValue ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
              boolValue ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
          {isDisabled && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Lock className="w-3 h-3" />
              Uses default
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <input
          type="text"
          disabled={isDisabled}
          value={typeof (isDisabled ? englishValue : displayValue) === 'object' ? JSON.stringify(isDisabled ? englishValue : displayValue) : (isDisabled ? englishValue : displayValue) || ''}
          onChange={(e) => {
            if (isDisabled) return;
            const newValue = e.target.value;
            updateAttribute(key, newValue);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
          className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 ${
            isDisabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
          }`}
          placeholder={isTranslationView && isTranslatable ? `Enter ${currentLanguage} translation` : `Enter ${getFieldLabel(key)}`}
        />
        {isDisabled && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-slate-600">
            <Lock className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  }

  if (!isOpen || !product) return null;

  // Show edit choice modal if there's a pending publication
  if (showEditChoice && pendingPublication) {
    const publishDate = new Date(pendingPublication.publish_at);
    const formattedDate = publishDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Pending Publication</h2>
          <p className="text-slate-700 mb-6">
            This product has changes scheduled to publish on <strong>{formattedDate}</strong>.
            How would you like to proceed?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setEditMode('scheduled');
                setShowEditChoice(false);
                // Load the scheduled changes
                if (pendingPublication.changes) {
                  setName(pendingPublication.changes.name || product.name);
                  setAttributes(pendingPublication.changes.attributes || product.attributes);
                  setAttributeOverrides(pendingPublication.changes.attribute_overrides || {});
                  setFieldLinks(pendingPublication.changes.attribute_mappings || {});
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 rounded-lg transition-colors text-left"
            >
              <Calendar className="w-6 h-6 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-purple-900">Edit Scheduled Changes</div>
                <div className="text-sm text-purple-700">Modify what will publish on {formattedDate}</div>
              </div>
            </button>

            <button
              onClick={() => {
                setEditMode('immediate');
                setShowEditChoice(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 rounded-lg transition-colors text-left"
            >
              <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-blue-900">Make Immediate Changes</div>
                <div className="text-sm text-blue-700">Publish now (cancels scheduled changes)</div>
              </div>
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col relative z-[61]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Edit Product</h2>
              {policyViolations.length > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg shadow-sm text-xs font-medium text-amber-800">
                  <AlertCircle className="w-4 h-4" />
                  {policyViolations.length} Policy Violation{policyViolations.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">ID: {product.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            {availableLanguages().length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowLocaleDropdown(!showLocaleDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
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
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Policy Violations Banner */}
        {policyViolations.length > 0 && (
          <div className="border-b border-amber-200 px-6 py-3 flex-shrink-0 bg-amber-50">
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

        {/* Language Context Banner */}
        {currentLanguage !== 'en' && (
          <div className="border-b border-blue-200 px-6 py-3 flex items-center justify-between flex-shrink-0 bg-blue-50">
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* API Integration Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Link className="w-4 h-4" />
              API Integration
            </h3>

            {product.mapping_id && product.integration_source_id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <StateBadge variant="api" text="Linked to API" />
                  {product.local_fields && product.local_fields.length > 0 && (
                    <StateBadge variant="local" text={`${product.local_fields.length} override(s)`} />
                  )}
                  {product.price_calculations && Object.keys(product.price_calculations).length > 0 && (
                    <StateBadge variant="calculated" text="Has calculations" />
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  <div><span className="font-medium">Mapping ID:</span> {product.mapping_id}</div>
                  <div><span className="font-medium">Type:</span> {product.integration_type}</div>
                  {product.last_synced_at && (
                    <div><span className="font-medium">Last synced:</span> {new Date(product.last_synced_at).toLocaleString()}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await integrationLinkService.unlinkProduct(product.id);
                        alert('Product unlinked from API');
                        onSuccess();
                      } catch (error: any) {
                        alert(error.message);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Unlink className="w-3 h-3 inline mr-1" />
                    Unlink
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  This product is not linked to any API source. Link it to sync data automatically.
                </p>
                <button
                  onClick={() => {
                    alert('API linking modal coming soon. For now, use the Integration Catalog page to link products.');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Link className="w-4 h-4 inline mr-2" />
                  Link to API Source
                </button>
              </div>
            )}
          </div>

          {/* Attributes Section */}
          <div id="attributes-section">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-slate-700">
                Product Attributes
              </label>
              {!product.integration_product_id && (
                <button
                  onClick={addAttribute}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Attribute
                </button>
              )}
            </div>

            {Object.keys(attributes).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No attributes yet.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Required Attributes - Structured Layout */}
                <div className="space-y-4">
                  {/* Name and Description - Full Width */}
                  {['name', 'description'].map(key => {
                    if (!(key in attributes)) return null;
                    const value = currentLanguage === 'en' ? attributes[key] : getAttributeValue(key);
                    const isOverridden = syncStatus?.overridden[key];
                    const isLocalOnly = syncStatus?.localOnly[key] !== undefined;
                    const actualValue = value ?? (isOverridden ? isOverridden.current : syncStatus?.synced[key]);
                    const integrationValue = isOverridden?.integration;
                    const isDropdownOpen = openDropdown === key;
                    const hasValue = actualValue !== undefined && actualValue !== null && actualValue !== '';
                    const translationStatus = getTranslationStatus(key);

                    const syncState = syncStateManager?.getSyncState(key) || 'none';
                    const syncConfig = syncStateManager?.getSyncConfig(key);
                    const canRevert = syncStateManager?.canRevertToSync(key) || false;

                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{getFieldLabel(key)}</label>
                            {translationStatus === 'complete' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                <Check className="w-3 h-3" />
                                Translated
                              </span>
                            )}
                            {translationStatus === 'missing' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                <AlertCircle className="w-3 h-3" />
                                Translation needed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {syncState !== 'none' && (
                              <div className="relative">
                                <SyncBadge
                                  state={syncState}
                                  mappedTo={syncConfig?.mappedTo}
                                  apiSource={syncConfig?.apiSourceName}
                                  isActive={syncConfig?.isActive}
                                  canSync={syncStateManager?.canSync(key)}
                                  onClick={() => setOpenDropdown(isDropdownOpen ? null : key)}
                                  onRevert={canRevert ? () => handleRevertToSync(key) : undefined}
                                />
                                {isDropdownOpen && (
                                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-[70] overflow-hidden">
                                    {syncState === 'linked-active' && (
                                      <>
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                                          <p className="text-xs font-medium text-slate-700">Currently synced from:</p>
                                          <p className="text-xs text-slate-600 mt-0.5">{syncConfig?.apiSourceName} → {syncConfig?.mappedTo}</p>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSync(key);
                                            setOpenDropdown(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2 border-b border-slate-100"
                                        >
                                          <Unlink className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="font-medium text-slate-900">Disable Sync</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Edit this field manually</div>
                                          </div>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMappingAttributeKey(key);
                                            setShowMappingModal(true);
                                            setOpenDropdown(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2"
                                        >
                                          <Link className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="font-medium text-slate-900">Change Mapping</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Link to different API field</div>
                                          </div>
                                        </button>
                                      </>
                                    )}
                                    {syncState === 'linked-inactive' && (
                                      <>
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                                          <p className="text-xs font-medium text-slate-700">Sync available from:</p>
                                          <p className="text-xs text-slate-600 mt-0.5">{syncConfig?.apiSourceName} → {syncConfig?.mappedTo}</p>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSync(key);
                                            setOpenDropdown(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2"
                                        >
                                          <Link className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="font-medium text-slate-900">Enable Sync</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Sync value from integration</div>
                                          </div>
                                        </button>
                                      </>
                                    )}
                                    {syncState === 'locally-applied' && canRevert && (
                                      <>
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                                          <p className="text-xs font-medium text-slate-700">Local override active</p>
                                          <p className="text-xs text-slate-600 mt-0.5">Sync is disabled for this field</p>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRevertToSync(key);
                                            setOpenDropdown(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="font-medium text-slate-900">Revert to Sync</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Restore synced value</div>
                                          </div>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {syncStatus && !isLocalOnly && hasValue && !syncState && (
                            <div className="relative">
                              {isOverridden ? (
                                <>
                                  <button
                                    onClick={() => setOpenDropdown(isDropdownOpen ? null : key)}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                  >
                                    <Unlink className="w-3 h-3" />
                                    <span>Local</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isDropdownOpen && (
                                    <div className="dropdown-menu absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-[70] overflow-hidden">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          enableSync(key);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-start gap-2"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <div className="font-medium text-slate-900">Revert to Sync</div>
                                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                                            {typeof integrationValue === 'object' ? JSON.stringify(integrationValue) : integrationValue}
                                          </div>
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => lockOverride(key)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                >
                                  <Link className="w-3 h-3" />
                                  <span>Syncing</span>
                                </button>
                              )}
                            </div>
                          )}
                          </div>
                        </div>
                        {renderAttributeField(key, actualValue, syncStatus, isOverridden, isLocalOnly)}
                      </div>
                    );
                  })}

                  {/* Price and Calories - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    {['price', 'calories'].map(key => {
                      if (!(key in attributes)) return null;
                      const value = currentLanguage === 'en' ? attributes[key] : getAttributeValue(key);
                      const fieldLink = fieldLinks[key];
                      const hasCalculation = fieldLink?.type === 'calculation';
                      const actualValue = value ?? '';
                      const isLocalOverride = currentProduct?.local_fields?.includes(key);
                      const hasApiLink = currentProduct?.mapping_id && currentProduct?.integration_source_id;
                      const hasCalculatedValue = currentProduct?.price_calculations?.[key];

                      // Determine the source
                      let source = 'manual';
                      if (hasCalculatedValue) {
                        source = 'calculated';
                      } else if (hasApiLink && !isLocalOverride) {
                        source = 'api';
                      } else if (isLocalOverride) {
                        source = 'custom';
                      }

                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{getFieldLabel(key)}</label>
                            {hasApiLink && (
                              <div className="relative">
                                {isLocalOverride ? (
                                  <select
                                    value="custom"
                                    onChange={async (e) => {
                                      if (e.target.value === 'api' && currentProduct) {
                                        if (currentProduct.parent_product_id) {
                                          await LocationProductService.clearLocationOverride(currentProduct.id, key);
                                        } else {
                                          await integrationLinkService.clearLocalOverride(currentProduct.id, key);
                                        }
                                        const updatedProduct = await LocationProductService.getProductForLocation(
                                          currentProduct.parent_product_id || currentProduct.id,
                                          location
                                        );
                                        if (updatedProduct) {
                                          setCurrentProduct(updatedProduct);
                                          setAttributes(updatedProduct.attributes || {});
                                        }
                                        onSuccess();
                                      }
                                    }}
                                    className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="custom">Custom</option>
                                    <option value="api">
                                      {currentProduct?.parent_product_id ? 'Inherit from Parent' : 'Inherit from API'}
                                    </option>
                                  </select>
                                ) : (
                                  <span className="text-xs px-2 py-1 text-blue-600 font-medium">Syncing</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={actualValue}
                              onChange={async (e) => {
                                const newValue = e.target.value;
                                if (hasApiLink && !isLocalOverride && currentProduct) {
                                  const success = await LocationProductService.enableLocationOverride(
                                    currentProduct.id,
                                    key,
                                    newValue,
                                    location
                                  );
                                  if (success) {
                                    const updatedProduct = await LocationProductService.getProductForLocation(
                                      currentProduct.id,
                                      location
                                    );
                                    if (updatedProduct) {
                                      setCurrentProduct(updatedProduct);
                                      setAttributes(updatedProduct.attributes || {});
                                      onSuccess();
                                    }
                                  }
                                } else {
                                  updateAttribute(key, newValue);
                                }
                              }}
                              className="w-full px-4 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={getFieldLabel(key)}
                            />
                          </div>
                          {key === 'price' && hasCalculation && fieldLink.calculation && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-2">
                              <p className="text-xs font-medium text-slate-600 mb-2">Combo Pricing:</p>
                              <div className="space-y-1">
                                {fieldLink.calculation.map((part: any, index: number) => {
                                  const isSubtract = index > 0 && part.operation === 'subtract';
                                  return (
                                    <div key={part.id} className="flex items-center gap-2 text-sm">
                                      {index > 0 && (
                                        <span className={`font-bold w-4 text-center ${
                                          part.operation === 'subtract' ? 'text-red-600' : 'text-slate-600'
                                        }`}>
                                          {part.operation === 'add' ? '+' : '−'}
                                        </span>
                                      )}
                                      {index === 0 && <span className="w-4"></span>}
                                      <div className="flex-1 flex items-center justify-between bg-white px-3 py-1.5 rounded border border-slate-200">
                                        <span className={`font-medium ${isSubtract ? 'text-red-700' : 'text-slate-700'}`}>
                                          {part.productName}
                                        </span>
                                        <span className={`font-semibold ${isSubtract ? 'text-red-700' : 'text-slate-900'}`}>
                                          ${typeof part.value === 'number' ? part.value.toFixed(2) : part.value}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Other Core Attributes - Dynamic based on template */}
                  {(() => {
                    const otherCoreKeys = Object.keys(attributes).filter(k => {
                      // Must be in template's core_attributes
                      if (!isAttributeInCoreSchema(k)) return false;
                      // Exclude already-rendered attributes
                      if (['name', 'description', 'price', 'calories', 'translations', 'attribute_overrides'].includes(k)) return false;
                      // Exclude special types that have their own sections
                      const meta = getAttributeMeta(k);
                      if (meta?.type === 'image' || meta?.type === 'sizes' || meta?.type === 'translation') return false;
                      return true;
                    });
                    if (otherCoreKeys.length === 0) return null;

                    return (
                      <div className="flex flex-wrap gap-3 pt-4">
                        {otherCoreKeys.map(key => {
                          const value = currentLanguage === 'en' ? attributes[key] : getAttributeValue(key);
                          const actualValue = value ?? '';
                          const isLocalOverride = currentProduct?.local_fields?.includes(key);
                          const isChildProduct = !!currentProduct?.parent_product_id;
                          const isFieldSynced = syncStatus?.synced[key] !== undefined;
                          const showBadge = isChildProduct ? isLocalOverride : isFieldSynced;

                          return (
                            <div key={key} className="flex-1 min-w-[200px] max-w-[300px]">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-slate-600">{getFieldLabel(key)}</label>
                                {showBadge && (
                                  <div className="relative">
                                    {isLocalOverride ? (
                                      <select
                                        value="custom"
                                        onChange={async (e) => {
                                          if (e.target.value === 'api' && currentProduct) {
                                            if (currentProduct.parent_product_id) {
                                              await LocationProductService.clearLocationOverride(currentProduct.id, key);
                                            } else {
                                              await integrationLinkService.clearLocalOverride(currentProduct.id, key);
                                            }
                                            const updatedProduct = await LocationProductService.getProductForLocation(
                                              currentProduct.parent_product_id || currentProduct.id,
                                              location
                                            );
                                            if (updatedProduct) {
                                              setCurrentProduct(updatedProduct);
                                              setAttributes(updatedProduct.attributes || {});
                                            }
                                            onSuccess();
                                          }
                                        }}
                                        className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="custom">Custom</option>
                                        <option value="api">
                                          {currentProduct?.parent_product_id ? 'Inherit from Parent' : 'Inherit from API'}
                                        </option>
                                      </select>
                                    ) : (
                                      <span className="text-xs px-2 py-1 text-blue-600 font-medium">Syncing</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {renderAttributeField(key, actualValue, syncStatus, isLocalOverride, false)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Image Attributes Section */}
                {(() => {
                  const imageKeys = Object.keys(attributes).filter(k => {
                    const meta = getAttributeMeta(k);
                    return meta?.type === 'image';
                  });
                  if (imageKeys.length === 0) return null;

                  return (
                    <div className="pt-4 border-t border-slate-200">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Images</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {imageKeys.map(key => {
                          const value = currentLanguage === 'en' ? attributes[key] : getAttributeValue(key);
                          const isOverridden = syncStatus?.overridden[key];
                          const isLocalOnly = syncStatus?.localOnly[key] !== undefined;
                          const actualValue = value ?? (isOverridden ? isOverridden.current : syncStatus?.synced[key]);
                          const integrationValue = isOverridden?.integration;
                          const isDropdownOpen = openDropdown === key;
                          const hasValue = actualValue !== undefined && actualValue !== null && actualValue !== '';
                          const meta = getAttributeMeta(key);

                          return (
                            <div key={key} className="flex flex-col">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-slate-600">{getFieldLabel(key)}</label>
                                {syncStatus && !isLocalOnly && hasValue && (
                                  <div className="relative">
                                    {isOverridden ? (
                                      <>
                                        <button
                                          onClick={() => setOpenDropdown(isDropdownOpen ? null : key)}
                                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                        >
                                          <Unlink className="w-3 h-3" />
                                          <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isDropdownOpen && (
                                          <div className="dropdown-menu absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-[70] overflow-hidden">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                enableSync(key);
                                                setOpenDropdown(null);
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-start gap-2"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                              <div className="flex-1">
                                                <div className="font-medium text-slate-900">Revert to Sync</div>
                                                <div className="text-xs text-slate-500 mt-0.5">Restore from integration</div>
                                              </div>
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => lockOverride(key)}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                      >
                                        <Link className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {renderAttributeField(key, actualValue, syncStatus, isOverridden, isLocalOnly)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Options Section */}
                {(() => {
                  const optionsKeys = Object.keys(attributes).filter(k => {
                    const meta = getAttributeMeta(k);
                    return meta?.type === 'sizes';
                  });
                  if (optionsKeys.length === 0) return null;

                  return (
                    <div className="pt-4 border-t border-slate-200">
                      {optionsKeys.map(key => {
                        const value = currentLanguage === 'en' ? attributes[key] : getAttributeValue(key);
                        const isOverridden = syncStatus?.overridden[key];
                        const isLocalOnly = syncStatus?.localOnly[key] !== undefined;
                        const actualValue = value ?? (isOverridden ? isOverridden.current : syncStatus?.synced[key]);
                        const meta = getAttributeMeta(key);

                        return (
                          <div key={key}>
                            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">{getFieldLabel(key)}</h3>
                            {renderAttributeField(key, actualValue, syncStatus, isOverridden, isLocalOnly)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Extended Attributes - Flexible Grid */}
                {(() => {
                  const extendedKeys = Object.keys(attributes).filter(k => {
                    const meta = getAttributeMeta(k);
                    // Exclude system fields and fields that should be rendered elsewhere
                    if (['translations', 'attribute_overrides'].includes(k)) return false;
                    if (meta?.type === 'image' || meta?.type === 'sizes') return false;
                    // Check if it's in the core schema of the template
                    return !isAttributeInCoreSchema(k);
                  });
                  if (extendedKeys.length === 0) return null;

                  return (
                    <div className="pt-4 border-t border-slate-200">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Extended Attributes</h3>
                      <div className="flex flex-wrap gap-3">
                        {extendedKeys.map(key => {
                          const value = currentLanguage === 'en' ? attributes[key] : getAttributeValue(key);
                          const actualValue = value ?? '';
                          const isLocalOverride = currentProduct?.local_fields?.includes(key);
                          const isChildProduct = !!currentProduct?.parent_product_id;
                          const isFieldSynced = syncStatus?.synced[key] !== undefined;
                          const showBadge = isChildProduct ? isLocalOverride : isFieldSynced;

                          return (
                            <div key={key} className="flex-1 min-w-[200px] max-w-[300px]">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-slate-600">{getFieldLabel(key)}</label>
                                {showBadge && (
                                  <div className="relative">
                                    {isLocalOverride ? (
                                      <select
                                        value="custom"
                                        onChange={async (e) => {
                                          if (e.target.value === 'api' && currentProduct) {
                                            if (currentProduct.parent_product_id) {
                                              await LocationProductService.clearLocationOverride(currentProduct.id, key);
                                            } else {
                                              await integrationLinkService.clearLocalOverride(currentProduct.id, key);
                                            }
                                            const updatedProduct = await LocationProductService.getProductForLocation(
                                              currentProduct.parent_product_id || currentProduct.id,
                                              location
                                            );
                                            if (updatedProduct) {
                                              setCurrentProduct(updatedProduct);
                                              setAttributes(updatedProduct.attributes || {});
                                            }
                                            onSuccess();
                                          }
                                        }}
                                        className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="custom">Custom</option>
                                        <option value="api">
                                          {currentProduct?.parent_product_id ? 'Inherit from Parent' : 'Inherit from API'}
                                        </option>
                                      </select>
                                    ) : (
                                      <span className="text-xs px-2 py-1 text-blue-600 font-medium">Syncing</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {renderAttributeField(key, actualValue, syncStatus, isLocalOverride, false)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          {product.integration_product_id && (
            <div className="text-xs text-slate-500">
              <Link className="w-3 h-3 inline mr-1" />
              Synced from integration
            </div>
          )}
          {!product.integration_product_id && <div></div>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>

            {editMode === 'scheduled' && pendingPublication ? (
              <button
                onClick={() => handlePublish()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Scheduled Changes
              </button>
            ) : editMode === 'immediate' ? (
              <button
                onClick={() => handlePublish()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                Publish Now
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowPublishOptions(!showPublishOptions)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  Publish
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showPublishOptions && (
                  <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                    <div className="p-4 space-y-4">
                      <button
                        onClick={() => {
                          setShowPublishOptions(false);
                          handlePublish();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left"
                      >
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-900">Publish Immediately</div>
                          <div className="text-xs text-blue-700">Changes go live now</div>
                        </div>
                      </button>

                      <div className="space-y-3">
                        <div className="text-sm font-medium text-slate-700">Schedule for Later</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={publishDate}
                            onChange={(e) => setPublishDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min={new Date().toISOString().split('T')[0]}
                          />
                          <input
                            type="time"
                            value={publishTime}
                            onChange={(e) => setPublishTime(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (!publishDate || !publishTime) {
                              alert('Please select both date and time');
                              return;
                            }
                            const publishAt = `${publishDate}T${publishTime}:00`;
                            setShowPublishOptions(false);
                            handlePublish(publishAt);
                          }}
                          disabled={!publishDate || !publishTime}
                          className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Schedule Publication
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price/Calories Field Link Modal */}
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

              // Recalculate the field if it's a calculation
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

      {/* Integration Field Mapping Modal */}
      {showMappingModal && mappingAttributeKey && integrationData && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Link to Integration Field</h3>
              <button
                onClick={() => {
                  setShowMappingModal(false);
                  setMappingAttributeKey(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <div className="text-sm text-slate-600">
                  Linking attribute: <span className="font-semibold text-slate-900">{mappingAttributeKey}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-3">
                  Select Integration Field
                </div>
                {Object.entries(flattenObject(integrationData)).map(([path, value]) => (
                  <button
                    key={path}
                    onClick={() => handleSetMapping(path)}
                    className="w-full text-left p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="font-medium text-sm text-slate-900 group-hover:text-blue-700">{path}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to flatten nested objects for field selection
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}
