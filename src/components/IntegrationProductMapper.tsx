import { useState, useEffect } from 'react';
import { X, ArrowRight, Save, Package, Database, Filter, Search, Link2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IntegrationProduct {
  id: string;
  name: string;
  external_id: string;
  source_id: string;
  integration_type: string;
  data: any;
}

interface IntegrationSource {
  id: string;
  name: string;
}

interface AttributeTemplate {
  id: string;
  name: string;
  attribute_schema: {
    core_attributes: AttributeField[];
    extended_attributes: AttributeField[];
  };
}

interface AttributeField {
  name: string;
  type: string;
  required: boolean;
  label: string;
}

interface AttributeMapping {
  integration_field: string;
  wand_field: string;
  transform?: string;
}

interface IntegrationProductMapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IntegrationProductMapper({ isOpen, onClose, onSuccess }: IntegrationProductMapperProps) {
  const [loading, setLoading] = useState(false);
  const [integrationProducts, setIntegrationProducts] = useState<IntegrationProduct[]>([]);
  const [sources, setSources] = useState<IntegrationSource[]>([]);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedIntegrationProduct, setSelectedIntegrationProduct] = useState<IntegrationProduct | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [mappings, setMappings] = useState<AttributeMapping[]>([]);
  const [integrationFields, setIntegrationFields] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    loadIntegrationProducts();
  }, [searchQuery, selectedType, selectedSource]);

  useEffect(() => {
    if (selectedIntegrationProduct) {
      extractIntegrationFields(selectedIntegrationProduct.data);
    }
  }, [selectedIntegrationProduct]);

  async function loadData() {
    setLoading(true);
    try {
      const [sourcesRes, templatesRes] = await Promise.all([
        supabase.from('integration_sources').select('*').order('name'),
        supabase.from('product_attribute_templates').select('*').order('name')
      ]);

      if (sourcesRes.data) setSources(sourcesRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadIntegrationProducts() {
    let query = supabase
      .from('integration_products')
      .select('*')
      .order('name')
      .limit(100);

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,external_id.ilike.%${searchQuery}%`);
    }

    if (selectedSource) {
      query = query.eq('source_id', selectedSource);
    }

    const { data } = await query;
    if (data) setIntegrationProducts(data);
  }

  function extractIntegrationFields(data: any, prefix = ''): void {
    const fields: string[] = [];

    function traverse(obj: any, path: string) {
      if (obj === null || obj === undefined) return;

      if (typeof obj !== 'object') {
        fields.push(path);
        return;
      }

      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          traverse(obj[0], `${path}[0]`);
        }
        return;
      }

      Object.keys(obj).forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        traverse(obj[key], newPath);
      });
    }

    traverse(data, '');
    setIntegrationFields(fields.sort());
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

  function addMapping(integrationField: string, wandField: string) {
    const existingIndex = mappings.findIndex(m => m.wand_field === wandField);

    if (existingIndex >= 0) {
      const newMappings = [...mappings];
      newMappings[existingIndex] = { integration_field: integrationField, wand_field: wandField };
      setMappings(newMappings);
    } else {
      setMappings([...mappings, { integration_field: integrationField, wand_field: wandField }]);
    }
  }

  function removeMapping(wandField: string) {
    setMappings(mappings.filter(m => m.wand_field !== wandField));
  }

  function getMappedIntegrationField(wandField: string): string | undefined {
    return mappings.find(m => m.wand_field === wandField)?.integration_field;
  }

  async function saveMapping() {
    if (!selectedIntegrationProduct || !selectedTemplate) {
      alert('Please select both an integration product and a template');
      return;
    }

    setLoading(true);
    try {
      await supabase.from('integration_attribute_mappings').insert({
        integration_product_id: selectedIntegrationProduct.id,
        integration_type: selectedIntegrationProduct.integration_type || 'product',
        attribute_mappings: { mappings }
      });

      alert('Mapping saved successfully');
    } catch (error) {
      console.error('Error saving mapping:', error);
      alert('Failed to save mapping');
    } finally {
      setLoading(false);
    }
  }

  async function createProductFromMapping() {
    if (!selectedIntegrationProduct || !selectedTemplate || mappings.length === 0) {
      alert('Please select products and create mappings first');
      return;
    }

    setLoading(true);
    try {
      const attributes: Record<string, any> = {};

      mappings.forEach(mapping => {
        const value = getNestedValue(selectedIntegrationProduct.data, mapping.integration_field);
        if (value !== undefined) {
          attributes[mapping.wand_field] = value;
        }
      });

      const productName = attributes.name || selectedIntegrationProduct.name;

      await supabase.from('products').insert({
        name: productName,
        attribute_template_id: selectedTemplate,
        integration_product_id: selectedIntegrationProduct.id,
        attributes
      });

      alert('Product created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const allWandFields = selectedTemplateData
    ? [
        ...selectedTemplateData.attribute_schema.core_attributes,
        ...selectedTemplateData.attribute_schema.extended_attributes
      ]
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Integration Product Mapper</h2>
              <p className="text-sm text-slate-600">Map integration product attributes to Wand product attributes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-80 border-r border-slate-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Sources</option>
                {sources.map(source => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="product">Products</option>
                <option value="modifier">Modifiers</option>
                <option value="discount">Discounts</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              {integrationProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedIntegrationProduct(product)}
                  className={`w-full text-left p-3 border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                    selectedIntegrationProduct?.id === product.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="font-medium text-sm text-slate-900 line-clamp-1">{product.name}</div>
                  <div className="text-xs text-slate-500 mt-1">ID: {product.external_id}</div>
                  {product.integration_type && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                      {product.integration_type}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {!selectedIntegrationProduct ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select an integration product</p>
                  <p className="text-sm mt-2">Choose a product from the list to start mapping attributes</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{selectedIntegrationProduct.name}</h3>
                    <p className="text-sm text-slate-600">Map attributes to create a Wand product</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveMapping}
                      disabled={loading || mappings.length === 0}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save Mapping
                    </button>
                    <button
                      onClick={createProductFromMapping}
                      disabled={loading || mappings.length === 0 || !selectedTemplate}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      <Package className="w-4 h-4" />
                      Create Product
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Target Product Template *
                    </div>
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      setMappings([]);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a template...</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Integration Product Fields
                      </h4>
                      <div className="space-y-1 bg-slate-50 rounded-lg p-3 max-h-96 overflow-y-auto">
                        {integrationFields.map(field => {
                          const value = getNestedValue(selectedIntegrationProduct.data, field);
                          return (
                            <div key={field} className="p-2 bg-white rounded border border-slate-200 hover:border-blue-400 transition-colors">
                              <div className="text-sm font-mono text-slate-700">{field}</div>
                              <div className="text-xs text-slate-500 mt-1 truncate">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Wand Product Attributes
                      </h4>
                      <div className="space-y-2">
                        {allWandFields.map(field => {
                          const mappedField = getMappedIntegrationField(field.name);
                          return (
                            <div key={field.name} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium text-sm text-slate-900">{field.label}</div>
                                  <div className="text-xs text-slate-500">Field: {field.name}</div>
                                </div>
                                {field.required && (
                                  <span className="text-xs font-medium text-red-600">Required</span>
                                )}
                              </div>

                              {mappedField ? (
                                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                                  <ArrowRight className="w-3 h-3 text-green-600 flex-shrink-0" />
                                  <span className="text-xs font-mono text-green-700 flex-1 truncate">{mappedField}</span>
                                  <button
                                    onClick={() => removeMapping(field.name)}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      addMapping(e.target.value, field.name);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">Map from integration field...</option>
                                  {integrationFields.map(intField => (
                                    <option key={intField} value={intField}>{intField}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
