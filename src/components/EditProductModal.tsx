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

  useEffect(() => {
    if (product) {
      setName(product.name);
      setAttributes(product.attributes || {});
      setAttributeOverrides(product.attribute_overrides || {});
      loadIntegrationData();
    }
  }, [product]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
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
      const { error } = await supabase
        .from('products')
        .update({
          name: name,
          attributes: attributes,
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
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
                    const actualValue = isOverridden ? isOverridden.current : value;
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
                                        <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                                          <button
                                            onClick={() => {
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
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                      <Link className="w-3.5 h-3.5" />
                                      <span>Syncing</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              value={typeof actualValue === 'object' ? JSON.stringify(actualValue) : actualValue}
                              onChange={(e) => {
                                let newValue: any = e.target.value;
                                try {
                                  newValue = JSON.parse(e.target.value);
                                } catch {
                                  // Keep as string if not valid JSON
                                }
                                updateAttribute(key, newValue);
                                if (!isLocalOnly && !isOverridden) {
                                  lockOverride(key);
                                }
                              }}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Value"
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
                          value={typeof value === 'object' ? JSON.stringify(value) : value}
                          onChange={(e) => {
                            let newValue: any = e.target.value;
                            try {
                              newValue = JSON.parse(e.target.value);
                            } catch {
                              // Keep as string if not valid JSON
                            }
                            updateAttribute(key, newValue);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Value"
                        />
                      </div>
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
