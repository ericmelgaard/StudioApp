import { useState, useEffect } from 'react';
import { X, Save, Trash2, RotateCcw, Link, Unlink, ChevronDown, Plus, Calendar, Clock, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUploadField from './ImageUploadField';
import RichTextEditor from './RichTextEditor';
import FieldLinkModal, { FieldLinkData } from './FieldLinkModal';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  attribute_overrides?: Record<string, boolean>;
  attribute_mappings?: Record<string, FieldLinkData>;
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

interface Size {
  id: string;
  label: string;
  price: number;
  is_active: boolean;
  is_out_of_stock: boolean;
  link?: FieldLinkData;
}

interface SizesEditorProps {
  sizes: Size[];
  onChange: (sizes: Size[]) => void;
}

function SizesEditor({ sizes, onChange }: SizesEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingSizeId, setLinkingSizeId] = useState<string | null>(null);
  const [currentLink, setCurrentLink] = useState<FieldLinkData | null>(null);
  const addSize = () => {
    const newSize: Size = {
      id: crypto.randomUUID(),
      label: '',
      price: 0,
      is_active: true,
      is_out_of_stock: false,
    };
    onChange([...sizes, newSize]);
  };

  const updateSize = (id: string, updates: Partial<Size>) => {
    onChange(sizes.map(size => size.id === id ? { ...size, ...updates } : size));
  };

  const openLinkModal = (sizeId: string) => {
    const size = sizes.find(s => s.id === sizeId);
    setLinkingSizeId(sizeId);
    setCurrentLink(size?.link || null);
    setShowLinkModal(true);
  };

  const handleLink = (linkData: FieldLinkData) => {
    if (linkingSizeId) {
      updateSize(linkingSizeId, { link: linkData });
    }
  };

  const handleUnlink = (sizeId: string) => {
    updateSize(sizeId, { link: undefined });
  };

  const removeSize = (id: string) => {
    onChange(sizes.filter(size => size.id !== id));
  };

  return (
    <div className="space-y-3">
      {sizes.map((size) => (
        <div key={size.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <input
              type="text"
              value={size.label}
              onChange={(e) => updateSize(size.id, { label: e.target.value })}
              placeholder="Size label (e.g., Small)"
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={!!size.link}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={size.price}
                onChange={(e) => updateSize(size.id, { price: parseFloat(e.target.value) || 0 })}
                disabled={!!size.link}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              />
              {size.link && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Linked</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">Active</span>
              <button
                onClick={() => updateSize(size.id, { is_active: !size.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  size.is_active ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    size.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">Out of Stock</span>
              <button
                onClick={() => updateSize(size.id, { is_out_of_stock: !size.is_out_of_stock })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  size.is_out_of_stock ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    size.is_out_of_stock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {size.link ? (
              <button
                onClick={() => handleUnlink(size.id)}
                className="p-2 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                title="Linked to integration product"
              >
                <Unlink className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => openLinkModal(size.id)}
                className="p-2 rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                title="Link to integration product"
              >
                <Link className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => removeSize(size.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addSize}
        className="w-full py-2.5 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Size
      </button>

      <FieldLinkModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setLinkingSizeId(null);
          setCurrentLink(null);
        }}
        onLink={handleLink}
        fieldName="price"
        fieldLabel="Size Price"
        currentLink={currentLink}
      />
    </div>
  );
}

export default function EditProductModal({ isOpen, onClose, product, onSuccess }: EditProductModalProps) {
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
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingAttributeKey, setMappingAttributeKey] = useState<string | null>(null);
  const [pendingPublication, setPendingPublication] = useState<any>(null);
  const [editMode, setEditMode] = useState<'immediate' | 'scheduled' | null>(null);
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [showEditChoice, setShowEditChoice] = useState(false);

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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (product) {
      setName(product.name);
      loadTemplateAttributes();
      setAttributeOverrides(product.attribute_overrides || {});
      const prodAttrMappings = (product as any).attribute_mappings || {};
      setAttributeMappings(prodAttrMappings);
      setFieldLinks(product.attribute_mappings || {});
      setTranslations(product.attributes?.translations || {});
      loadIntegrationData();
      checkPendingPublication();
    }
  }, [product]);

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

  async function loadTemplateAttributes() {
    if (!product) return;

    // Start with actual product attributes
    const productAttrs = product.attributes || {};

    // If product has a template, fetch and merge template attributes
    if (product.attribute_template_id) {
      try {
        const { data: template } = await supabase
          .from('product_attribute_templates')
          .select('attribute_schema')
          .eq('id', product.attribute_template_id)
          .maybeSingle();

        if (template?.attribute_schema) {
          const schema = template.attribute_schema as any;
          setTemplateSchema(schema);

          const coreAttrs = schema.core_attributes || [];
          const extendedAttrs = schema.extended_attributes || [];
          const allTemplateAttrs = [...coreAttrs, ...extendedAttrs];

          // Store list of template attribute names
          setTemplateAttributes(allTemplateAttrs.map((attr: any) => attr.name));

          // Merge template attributes with existing product attributes
          const mergedAttributes = { ...productAttrs };
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

          setAttributes(mergedAttributes);
          return;
        }
      } catch (error) {
        console.error('Error loading template:', error);
      }
    }

    // No template or error - just use product attributes
    setAttributes(productAttrs);
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
    if (!product?.integration_product_id) {
      setSyncStatus(null);
      return;
    }

    try {
      const { data: integrationProduct } = await supabase
        .from('integration_products')
        .select('data, source_id')
        .eq('id', product.integration_product_id)
        .maybeSingle();

      if (!integrationProduct) return;

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

        const mapping = productMapping || (templateMapping ? templateMapping.integration_field : null);

        if (mapping) {
          const integrationValue = getNestedValue(integrationProduct.data,
            typeof mapping === 'string' ? mapping : mapping);
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
      const updatedAttributes = {
        ...attributes,
        translations: translations
      };

      const changes = {
        name: name,
        attributes: updatedAttributes,
        attribute_overrides: attributeOverrides,
        attribute_mappings: fieldLinks,
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
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
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

  function canMapAttribute(key: string): boolean {
    // Can only map if there's integration data available
    if (!integrationData) return false;

    // Check if attribute type is mappable (not complex objects or arrays except for specific types)
    const meta = getAttributeMeta(key);
    if (meta?.type === 'sizes') return false; // Sizes have their own linking mechanism

    return true;
  }

  function renderAttributeField(key: string, actualValue: any, syncStatus: SyncStatus | null, isOverridden: any, isLocalOnly: boolean) {
    const meta = getAttributeMeta(key);

    if (meta?.type === 'image' && meta?.resolution) {
      return (
        <ImageUploadField
          value={actualValue || ''}
          onChange={(newValue) => {
            updateAttribute(key, newValue);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
          targetWidth={meta.resolution.width}
          targetHeight={meta.resolution.height}
          label={meta.label || key}
        />
      );
    }

    if (meta?.type === 'richtext') {
      return (
        <RichTextEditor
          value={actualValue || ''}
          onChange={(newValue) => {
            updateAttribute(key, newValue);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
          placeholder={`Enter ${meta.label || key}`}
          minHeight={meta.minHeight || '120px'}
        />
      );
    }

    if (meta?.type === 'sizes') {
      return (
        <SizesEditor
          sizes={Array.isArray(actualValue) ? actualValue : []}
          onChange={(newSizes) => {
            updateAttribute(key, newSizes);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
        />
      );
    }

    if (meta?.type === 'boolean') {
      const boolValue = actualValue === true || actualValue === 'true';
      return (
        <button
          onClick={() => {
            const newValue = !boolValue;
            updateAttribute(key, newValue);
            if (syncStatus && !isLocalOnly && !isOverridden) {
              lockOverride(key);
            }
          }}
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
      );
    }

    return (
      <input
        type="text"
        value={typeof actualValue === 'object' ? JSON.stringify(actualValue) : actualValue || ''}
        onChange={(e) => {
          const newValue = e.target.value;
          updateAttribute(key, newValue);
          if (syncStatus && !isLocalOnly && !isOverridden) {
            lockOverride(key);
          }
        }}
        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900"
        placeholder={`Enter ${key}`}
      />
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
            <h2 className="text-xl font-bold text-slate-900">Edit Product</h2>
            <p className="text-sm text-slate-500 mt-1">ID: {product.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Navigation Bookmarks */}
        <div className="border-b border-slate-200 px-6 py-3 flex gap-2 flex-shrink-0 bg-slate-50">
          <span className="text-xs font-medium text-slate-500 self-center mr-2">Jump to:</span>
          <button
            onClick={() => scrollToSection('attributes-section')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            Product Attributes
          </button>
          <button
            onClick={() => scrollToSection('translations-section')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            Translations
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
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
                    const value = attributes[key];
                    const isOverridden = syncStatus?.overridden[key];
                    const isLocalOnly = syncStatus?.localOnly[key] !== undefined;
                    const actualValue = value ?? (isOverridden ? isOverridden.current : syncStatus?.synced[key]);
                    const integrationValue = isOverridden?.integration;
                    const isDropdownOpen = openDropdown === key;
                    const hasValue = actualValue !== undefined && actualValue !== null && actualValue !== '';

                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{key}</label>
                          {syncStatus && !isLocalOnly && hasValue && (
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
                        {renderAttributeField(key, actualValue, syncStatus, isOverridden, isLocalOnly)}
                      </div>
                    );
                  })}

                  {/* Price and Calories - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    {['price', 'calories'].map(key => {
                      if (!(key in attributes)) return null;
                      const value = attributes[key];
                      const fieldLink = fieldLinks[key];
                      const hasCalculation = fieldLink?.type === 'calculation';
                      const actualValue = value ?? '';

                      return (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">{key === 'price' ? 'PRICE TEST' : key}</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={actualValue}
                              onChange={(e) => updateAttribute(key, e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                fieldLink ? 'border-green-400 bg-green-50 pr-24' : 'border-slate-300'
                              }`}
                              placeholder={key}
                            />
                            {fieldLink && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-green-700">
                                {hasCalculation ? <Calculator className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                                {hasCalculation ? 'Calculated' : 'Synced'}
                              </div>
                            )}
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
                          const value = attributes[key];
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
                                <label className="text-xs font-medium text-slate-600">{meta?.label || key}</label>
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

                {/* Sizes Section */}
                {(() => {
                  const sizesKeys = Object.keys(attributes).filter(k => {
                    const meta = getAttributeMeta(k);
                    return meta?.type === 'sizes';
                  });
                  if (sizesKeys.length === 0) return null;

                  return (
                    <div className="pt-4 border-t border-slate-200">
                      {sizesKeys.map(key => {
                        const value = attributes[key];
                        const isOverridden = syncStatus?.overridden[key];
                        const isLocalOnly = syncStatus?.localOnly[key] !== undefined;
                        const actualValue = value ?? (isOverridden ? isOverridden.current : syncStatus?.synced[key]);
                        const meta = getAttributeMeta(key);

                        return (
                          <div key={key}>
                            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">{meta?.label || key}</h3>
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
                    return !['name', 'description', 'price', 'calories', 'translations', 'attribute_overrides'].includes(k) &&
                           meta?.type !== 'image' && meta?.type !== 'sizes';
                  });
                  if (extendedKeys.length === 0) return null;

                  return (
                    <div className="pt-4 border-t border-slate-200">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Extended Attributes</h3>
                      <div className="flex flex-wrap gap-3">
                        {extendedKeys.map(key => {
                          const value = attributes[key];
                          const isOverridden = syncStatus?.overridden[key];
                          const isLocalOnly = syncStatus?.localOnly[key] !== undefined;
                          const isMapped = attributeMappings[key] !== undefined;
                          const actualValue = value ?? (isOverridden ? isOverridden.current : syncStatus?.synced[key]);
                          const integrationValue = isOverridden?.integration;
                          const isDropdownOpen = openDropdown === key;
                          const hasValue = actualValue !== undefined && actualValue !== null && actualValue !== '';

                          return (
                            <div key={key} className="flex-1 min-w-[200px] max-w-[300px]">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-slate-600">{key}</label>
                                <div className="flex items-center gap-1">
                                  {/* Product-level mapping button */}
                                  {canMapAttribute(key) && !isMapped && !syncStatus?.synced[key] && (
                                    <button
                                      onClick={() => openMappingModal(key)}
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                      title="Link to integration field"
                                    >
                                      <Link className="w-3 h-3" />
                                    </button>
                                  )}
                                  {/* Show mapped indicator */}
                                  {isMapped && (
                                    <button
                                      onClick={() => setOpenDropdown(isDropdownOpen ? null : key)}
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                                      title={`Mapped to ${attributeMappings[key]}`}
                                    >
                                      <Link className="w-3 h-3" />
                                      <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                  )}
                                  {isDropdownOpen && isMapped && (
                                    <div className="dropdown-menu absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-[70] overflow-hidden">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMapping(key);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-start gap-2"
                                      >
                                        <Unlink className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <div className="font-medium text-slate-900">Remove Mapping</div>
                                          <div className="text-xs text-slate-500 mt-0.5 truncate">{attributeMappings[key]}</div>
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                  {/* Template-level sync status */}
                                  {syncStatus && !isLocalOnly && hasValue && !isMapped && (
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
                                                  <div className="font-medium text-slate-900">Revert</div>
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
                                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                        >
                                          <Link className="w-3 h-3" />
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
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Translations Section */}
          <div id="translations-section" className="pt-6 border-t-2 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Translations
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowLocaleDropdown(!showLocaleDropdown)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Translation
                </button>
                {showLocaleDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowLocaleDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                      {commonLocales.map((locale) => (
                        <button
                          key={locale.code}
                          onClick={() => {
                            const attributeKey = prompt('Enter attribute name to translate:');
                            if (attributeKey && attributeKey.trim()) {
                              setTranslations(prev => ({
                                ...prev,
                                [locale.code]: {
                                  ...(prev[locale.code] || {}),
                                  [attributeKey.trim()]: ''
                                }
                              }));
                            }
                            setShowLocaleDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-slate-900">{locale.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{locale.code}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {Object.keys(translations).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No translations yet. Click "+ Add Translation" to add translations in any language.
                </p>
              ) : (
                Object.entries(translations).map(([locale, localeTranslations]) => (
                  <div key={locale} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase">{locale}</h3>
                      <button
                        onClick={() => {
                          const newTranslations = { ...translations };
                          delete newTranslations[locale];
                          setTranslations(newTranslations);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove Language
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(localeTranslations).map(([key, value]) => (
                        <div key={key} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-900">{key}</span>
                                <span className="text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded font-mono">{locale}</span>
                              </div>
                              <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => {
                                  setTranslations(prev => ({
                                    ...prev,
                                    [locale]: {
                                      ...prev[locale],
                                      [key]: e.target.value
                                    }
                                  }));
                                }}
                                className="w-full min-h-[40px] px-3 py-2 bg-white border-2 border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 font-medium"
                                placeholder={`Enter ${locale} translation for ${key}`}
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newLocaleTranslations = { ...localeTranslations };
                                delete newLocaleTranslations[key];
                                setTranslations(prev => ({
                                  ...prev,
                                  [locale]: newLocaleTranslations
                                }));
                              }}
                              className="text-slate-400 hover:text-red-600 transition-colors mt-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const attributeKey = prompt('Enter attribute name to translate:');
                          if (attributeKey && attributeKey.trim()) {
                            setTranslations(prev => ({
                              ...prev,
                              [locale]: {
                                ...prev[locale],
                                [attributeKey.trim()]: ''
                              }
                            }));
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
                      >
                        + Add attribute to {locale}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
