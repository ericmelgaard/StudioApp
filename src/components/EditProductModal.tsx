import { useState, useEffect } from 'react';
import { X, Save, Trash2, RotateCcw, Link, Unlink, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
      setAttributes(product.attributes || {});
      setAttributeOverrides(product.attribute_overrides || {});
      setTranslations(product.attributes?.translations || {});
      loadIntegrationData();
    }
  }, [product]);

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
            <div className="flex items-center justify-between mb-3">
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

            <div className="space-y-2">
              {Object.keys(attributes).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No attributes yet.
                </p>
              ) : syncStatus ? (
                <>
                  {[...Object.entries(syncStatus.synced), ...Object.entries(syncStatus.overridden), ...Object.entries(syncStatus.localOnly)].map(([key, value]) => {
                    const isOverridden = syncStatus.overridden[key];
                    const isLocalOnly = syncStatus.localOnly[key] !== undefined;
                    const actualValue = attributes[key] ?? (isOverridden ? isOverridden.current : value);
                    const integrationValue = isOverridden?.integration;
                    const isDropdownOpen = openDropdown === key;

                    return (
                      <div key={key} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-900">{key}</span>
                              {!isLocalOnly && (
                                <div className="relative">
                                  {isOverridden ? (
                                    <>
                                      <button
                                        onClick={() => setOpenDropdown(isDropdownOpen ? null : key)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                      >
                                        <Unlink className="w-3.5 h-3.5" />
                                        <span>Locally Applied</span>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                      </button>

                                      {isDropdownOpen && (
                                        <div
                                          className="dropdown-menu absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-[70] overflow-hidden"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              enableSync(key);
                                              setOpenDropdown(null);
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 flex items-start gap-2"
                                          >
                                            <RotateCcw className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                              <div className="font-medium text-slate-900">Revert to API Sync</div>
                                              <div className="text-xs text-slate-500 mt-1">
                                                API value: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{typeof integrationValue === 'object' ? JSON.stringify(integrationValue) : integrationValue}</span>
                                              </div>
                                            </div>
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => lockOverride(key)}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                      title="Click to lock current value and stop syncing"
                                    >
                                      <Link className="w-3.5 h-3.5" />
                                      <span>Syncing</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              value={typeof actualValue === 'object' ? JSON.stringify(actualValue) : actualValue || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newValue = e.target.value;
                                updateAttribute(key, newValue);
                                if (!isLocalOnly && !isOverridden) {
                                  lockOverride(key);
                                }
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full min-h-[40px] px-3 py-2 bg-white border-2 border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 font-medium"
                              placeholder="Enter value"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                Object.entries(attributes).map(([key, value]) => (
                  <div key={key} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <span className="text-sm font-medium text-slate-700 block">{key}</span>
                        <input
                          type="text"
                          value={typeof value === 'object' ? JSON.stringify(value) : value || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newValue = e.target.value;
                            updateAttribute(key, newValue);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full min-h-[40px] px-3 py-2 bg-white border-2 border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 font-medium"
                          placeholder="Enter value"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
