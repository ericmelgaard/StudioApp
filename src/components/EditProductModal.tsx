import { useState, useEffect } from 'react';
import { X, Save, Trash2, RotateCcw, Link, Unlink, ChevronDown, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUploadField from './ImageUploadField';
import RichTextEditor from './RichTextEditor';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  attribute_overrides?: Record<string, boolean>;
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
  linked_integration_product_id?: string;
}

interface SizesEditorProps {
  sizes: Size[];
  onChange: (sizes: Size[]) => void;
}

function SizesEditor({ sizes, onChange }: SizesEditorProps) {
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
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={size.price}
                onChange={(e) => updateSize(size.id, { price: parseFloat(e.target.value) || 0 })}
                disabled={!!size.linked_integration_product_id}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              />
              {size.linked_integration_product_id && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Synced</span>
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

            <button
              onClick={() => {
                alert('Integration linking will be implemented');
              }}
              className={`p-2 rounded-lg transition-colors ${
                size.linked_integration_product_id
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              title={size.linked_integration_product_id ? 'Linked to integration' : 'Link to integration product'}
            >
              <Link className="w-4 h-4" />
            </button>

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
    </div>
  );
}

export default function EditProductModal({ isOpen, onClose, product, onSuccess }: EditProductModalProps) {
  const [name, setName] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [attributeOverrides, setAttributeOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [integrationData, setIntegrationData] = useState<any>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [showLocaleDropdown, setShowLocaleDropdown] = useState(false);
  const [templateAttributes, setTemplateAttributes] = useState<string[]>([]);
  const [templateSchema, setTemplateSchema] = useState<any>(null);

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
      setTranslations(product.attributes?.translations || {});
      loadIntegrationData();
    }
  }, [product]);

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

      for (const key of Object.keys(currentAttributes)) {
        const mapping = mappings.find((m: any) => m.wand_field === key);

        if (mapping) {
          const integrationValue = getNestedValue(integrationProduct.data, mapping.integration_field);
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

  async function handleSave() {
    if (!product) return;

    setLoading(true);
    try {
      // Merge translations into attributes
      const updatedAttributes = {
        ...attributes,
        translations: translations
      };

      const { error } = await supabase
        .from('products')
        .update({
          name: name,
          attributes: updatedAttributes,
          attribute_overrides: attributeOverrides,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      alert('Product updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
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

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col relative z-[60]"
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
                          const actualValue = value ?? (isOverridden ? isOverridden.current : syncStatus?.synced[key]);
                          const integrationValue = isOverridden?.integration;
                          const isDropdownOpen = openDropdown === key;
                          const hasValue = actualValue !== undefined && actualValue !== null && actualValue !== '';

                          return (
                            <div key={key} className="flex-1 min-w-[200px] max-w-[300px]">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-slate-600">{key}</label>
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
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
