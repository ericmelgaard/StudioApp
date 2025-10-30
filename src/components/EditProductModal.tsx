import { useState, useEffect } from 'react';
import { X, Save, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
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
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [integrationData, setIntegrationData] = useState<any>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setAttributes(product.attributes || {});
      loadIntegrationData();
    }
  }, [product]);

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

      for (const key of Object.keys(currentAttributes)) {
        const mapping = mappings.find((m: any) => m.wand_field === key);

        if (mapping) {
          const integrationValue = getNestedValue(integrationProduct.data, mapping.integration_field);
          const currentValue = currentAttributes[key];

          if (JSON.stringify(integrationValue) === JSON.stringify(currentValue)) {
            syncedAttrs[key] = currentValue;
          } else {
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

  function removeAttribute(key: string) {
    const newAttributes = { ...attributes };
    delete newAttributes[key];
    setAttributes(newAttributes);
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

  function revertToIntegrationValue(key: string) {
    if (!syncStatus?.overridden[key]) return;
    updateAttribute(key, syncStatus.overridden[key].integration);
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Attributes
              </label>
              <button
                onClick={addAttribute}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Attribute
              </button>
            </div>

            <div className="space-y-4">
              {Object.keys(attributes).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No attributes yet. Click "Add Attribute" to create one.
                </p>
              ) : (
                <>
                  {syncStatus && Object.keys(syncStatus.synced).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-700 uppercase tracking-wide">
                        <RefreshCw className="w-3 h-3" />
                        Synced from Integration
                      </div>
                      {Object.entries(syncStatus.synced).map(([key, value]) => (
                        <div key={key} className="flex gap-3 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={key}
                              disabled
                              className="px-3 py-2 border border-green-300 rounded-lg bg-green-50 text-green-700 text-sm font-medium"
                            />
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
                              className="px-3 py-2 border border-green-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                              placeholder="Value"
                            />
                          </div>
                          <button
                            onClick={() => removeAttribute(key)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {syncStatus && Object.keys(syncStatus.overridden).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        Local Override
                      </div>
                      {Object.entries(syncStatus.overridden).map(([key, data]: [string, any]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex gap-3 items-start">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={key}
                                disabled
                                className="px-3 py-2 border border-amber-300 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium"
                              />
                              <input
                                type="text"
                                value={typeof data.current === 'object' ? JSON.stringify(data.current) : data.current}
                                onChange={(e) => {
                                  let newValue: any = e.target.value;
                                  try {
                                    newValue = JSON.parse(e.target.value);
                                  } catch {
                                    // Keep as string if not valid JSON
                                  }
                                  updateAttribute(key, newValue);
                                }}
                                className="px-3 py-2 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-semibold"
                                placeholder="Value"
                              />
                            </div>
                            <button
                              onClick={() => removeAttribute(key)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="ml-0 pl-4 border-l-2 border-slate-200 flex items-center justify-between">
                            <p className="text-xs text-slate-600">
                              Integration value: <span className="font-mono text-slate-800">{typeof data.integration === 'object' ? JSON.stringify(data.integration) : data.integration}</span>
                            </p>
                            <button
                              onClick={() => revertToIntegrationValue(key)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Revert
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {syncStatus && Object.keys(syncStatus.localOnly).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Local Only
                      </div>
                      {Object.entries(syncStatus.localOnly).map(([key, value]) => (
                        <div key={key} className="flex gap-3 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={key}
                              disabled
                              className="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 text-sm"
                            />
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
                              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Value"
                            />
                          </div>
                          <button
                            onClick={() => removeAttribute(key)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!syncStatus && Object.entries(attributes).map(([key, value]) => (
                    <div key={key} className="flex gap-3 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={key}
                          disabled
                          className="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 text-sm"
                        />
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
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <button
                        onClick={() => removeAttribute(key)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {product.integration_product_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This product was imported from an integration. Changes may be overwritten on the next sync.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
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
