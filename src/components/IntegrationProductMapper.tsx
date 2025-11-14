import { useState, useEffect } from 'react';
import { X, ArrowRight, Save, Package, Sparkles, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IntegrationSource {
  id: string;
  name: string;
  type: string;
  config: any;
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

interface SavedMapping {
  id: string;
  wand_integration_source_id: string;
  integration_type: string;
  attribute_mappings: {
    mappings: AttributeMapping[];
  };
  template_name: string | null;
  application_level: string;
  concept_id: number | null;
  is_inherited: boolean;
  parent_mapping_id: string | null;
}

interface IntegrationProductMapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  conceptId?: number;
  companyId?: number;
  storeId?: number;
}

const INTEGRATION_TYPES = [
  { value: 'product', label: 'Products', description: 'Regular menu items and products' },
  { value: 'modifier', label: 'Modifiers', description: 'Options and add-ons for products' },
  { value: 'discount', label: 'Discounts', description: 'Promotional items and discounts' }
];

export default function IntegrationProductMapper({ isOpen, onClose, onSuccess, conceptId, companyId, storeId }: IntegrationProductMapperProps) {
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<IntegrationSource[]>([]);
  const [availableSources, setAvailableSources] = useState<IntegrationSource[]>([]);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [sampleProducts, setSampleProducts] = useState<any[]>([]);

  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('product');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);

  const [mappings, setMappings] = useState<AttributeMapping[]>([]);
  const [integrationFields, setIntegrationFields] = useState<string[]>([]);
  const [savedMapping, setSavedMapping] = useState<SavedMapping | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (sources.length > 0) {
      filterAvailableSources();
    }
  }, [sources, conceptId, companyId, storeId]);

  useEffect(() => {
    if (availableSources.length > 0 && !selectedSource) {
      setSelectedSource(availableSources[0].id);
    }
  }, [availableSources]);

  useEffect(() => {
    if (selectedSource && selectedType) {
      loadExistingMapping();
      loadSampleProducts();
      setSelectedSampleIndex(0);
    } else {
      setMappings([]);
      setIntegrationFields([]);
      setSavedMapping(null);
      setSampleProducts([]);
      setSelectedSampleIndex(0);
    }
  }, [selectedSource, selectedType]);

  async function loadData() {
    setLoading(true);
    try {
      const [sourcesRes, templatesRes, orgSettingsRes] = await Promise.all([
        supabase.from('wand_integration_sources').select('*').order('name'),
        supabase.from('product_attribute_templates').select('*').order('name'),
        supabase.from('organization_settings').select('default_product_attribute_template_id').limit(1).maybeSingle()
      ]);

      if (sourcesRes.data) setSources(sourcesRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);

      if (orgSettingsRes.data?.default_product_attribute_template_id) {
        setSelectedTemplate(orgSettingsRes.data.default_product_attribute_template_id);
      } else if (templatesRes.data && templatesRes.data.length > 0) {
        setSelectedTemplate(templatesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function filterAvailableSources() {
    if (!conceptId && !companyId && !storeId) {
      setAvailableSources(sources);
      return;
    }

    try {
      let query = supabase
        .from('integration_source_configs')
        .select('wand_source_id, wand_integration_sources(id, name, integration_type)')
        .eq('is_active', true);

      if (storeId) {
        query = query.eq('store_id', storeId);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      } else if (conceptId) {
        query = query.eq('concept_id', conceptId);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const configuredSourceIds = new Set(data.map(d => d.wand_source_id));
        const filtered = sources.filter(s => configuredSourceIds.has(s.id));
        setAvailableSources(filtered.length > 0 ? filtered : sources);
      } else {
        setAvailableSources(sources);
      }
    } catch (error) {
      console.error('Error filtering sources:', error);
      setAvailableSources(sources);
    }
  }

  async function loadExistingMapping() {
    setLoading(true);
    try {
      let query = supabase
        .from('integration_attribute_mappings')
        .select('*')
        .eq('wand_integration_source_id', selectedSource)
        .eq('integration_type', selectedType)
        .eq('is_template', true);

      if (storeId) {
        query = query.eq('store_id', storeId);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      } else if (conceptId) {
        query = query.eq('concept_id', conceptId);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        setSavedMapping(data);
        setMappings(data.attribute_mappings.mappings || []);
      } else {
        const { data: inheritedData } = await supabase
          .rpc('get_integration_mapping_for_context', {
            p_wand_source_id: selectedSource,
            p_integration_type: selectedType,
            p_concept_id: conceptId || null,
            p_company_id: companyId || null,
            p_site_id: storeId || null
          })
          .maybeSingle();

        if (inheritedData) {
          setSavedMapping({
            id: inheritedData.mapping_id,
            wand_integration_source_id: selectedSource,
            integration_type: selectedType,
            attribute_mappings: inheritedData.mapping_data,
            template_name: inheritedData.template_name,
            application_level: inheritedData.application_level,
            concept_id: inheritedData.source_concept_id,
            is_inherited: true,
            parent_mapping_id: inheritedData.mapping_id
          });
          setMappings(inheritedData.mapping_data.mappings || []);
        } else {
          setSavedMapping(null);
          setMappings([]);
        }
      }
    } catch (error) {
      console.error('Error loading mapping:', error);
      setSavedMapping(null);
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSampleProducts() {
    try {
      const tableName = selectedType === 'product' ? 'integration_products'
        : selectedType === 'modifier' ? 'integration_modifiers'
        : 'integration_discounts';

      let query = supabase
        .from(tableName)
        .select('*')
        .eq('wand_source_id', selectedSource)
        .limit(5);

      if (storeId) {
        query = query.eq('store_id', storeId);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      } else if (conceptId) {
        query = query.eq('concept_id', conceptId);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        setSampleProducts(data);
        extractIntegrationFieldsFromAll(data);
      } else {
        setSampleProducts([]);
        setIntegrationFields([]);
      }
    } catch (error) {
      console.error('Error loading sample products:', error);
      setSampleProducts([]);
      setIntegrationFields([]);
    }
  }

  function extractIntegrationFieldsFromAll(records: any[]): void {
    const fieldSet = new Set<string>();

    function traverse(obj: any, path: string) {
      if (obj === null || obj === undefined) return;

      if (typeof obj !== 'object') {
        fieldSet.add(path);
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

    records.forEach(record => {
      if (record.data) {
        traverse(record.data, '');
      }
    });

    const fields = Array.from(fieldSet).sort();
    setIntegrationFields(fields);
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
    if (!selectedSource || !selectedType || !selectedTemplate) {
      alert('Please select a source, type, and template');
      return;
    }

    if (mappings.length === 0) {
      alert('Please create at least one mapping');
      return;
    }

    setLoading(true);
    try {
      const sourceName = availableSources.find(s => s.id === selectedSource)?.name || '';
      const typeName = INTEGRATION_TYPES.find(t => t.value === selectedType)?.label || '';
      const templateName = `${sourceName} - ${typeName}`;

      const applicationLevel = storeId ? 'store' : companyId ? 'company' : 'concept';
      const mappingData: any = {
        attribute_mappings: { mappings },
        template_name: templateName,
        application_level: applicationLevel,
        is_inherited: false,
        updated_at: new Date().toISOString()
      };

      if (storeId) mappingData.store_id = storeId;
      else if (companyId) mappingData.company_id = companyId;
      else if (conceptId) mappingData.concept_id = conceptId;

      if (savedMapping && !savedMapping.is_inherited) {
        await supabase
          .from('integration_attribute_mappings')
          .update(mappingData)
          .eq('id', savedMapping.id);
      } else {
        const insertData = {
          ...mappingData,
          wand_integration_source_id: selectedSource,
          integration_type: selectedType,
          is_template: true
        };

        if (savedMapping?.is_inherited && savedMapping.parent_mapping_id) {
          insertData.parent_mapping_id = savedMapping.parent_mapping_id;
        }

        await supabase.from('integration_attribute_mappings').insert(insertData);
      }

      alert('Mapping template saved successfully');
      await loadExistingMapping();
      onSuccess();
    } catch (error) {
      console.error('Error saving mapping:', error);
      alert('Failed to save mapping template');
    } finally {
      setLoading(false);
    }
  }

  async function reapplyToExistingProducts() {
    if (!selectedSource || !mappings.length) {
      alert('Please save the mapping template first');
      return;
    }

    const confirmed = confirm('This will update all existing products imported from this source. Continue?');
    if (!confirmed) return;

    setLoading(true);
    try {
      let query = supabase
        .from('integration_products')
        .select('id, data');

      if (storeId) {
        query = query.eq('store_id', storeId);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      } else if (conceptId) {
        query = query.eq('concept_id', conceptId);
      }

      const { data: integrationProducts } = await query;

      if (!integrationProducts || integrationProducts.length === 0) {
        alert('No products found for this source');
        return;
      }

      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, integration_product_id, attributes')
        .in('integration_product_id', integrationProducts.map(p => p.id));

      if (!existingProducts || existingProducts.length === 0) {
        alert('No products have been imported from this source yet');
        return;
      }

      const updates = existingProducts.map(product => {
        const integrationProduct = integrationProducts.find(ip => ip.id === product.integration_product_id);
        if (!integrationProduct) return null;

        const newAttributes: any = {};
        mappings.forEach((mapping: any) => {
          const value = getNestedValue(integrationProduct.data, mapping.integration_field);
          if (value !== undefined) {
            newAttributes[mapping.wand_field] = value;
          }
        });

        const mergedAttributes = {
          ...(product.attributes || {}),
          ...newAttributes
        };

        const productMappings: any = {};
        mappings.forEach((mapping: any) => {
          productMappings[mapping.wand_field] = mapping.integration_field;
        });

        return {
          id: product.id,
          attributes: mergedAttributes,
          attribute_mappings: productMappings,
          updated_at: new Date().toISOString()
        };
      }).filter(Boolean);

      for (const update of updates) {
        await supabase
          .from('products')
          .update({
            attributes: update!.attributes,
            attribute_mappings: update!.attribute_mappings
          })
          .eq('id', update!.id);
      }

      alert(`Successfully updated ${updates.length} products`);
      onSuccess();
    } catch (error) {
      console.error('Error reapplying mapping:', error);
      alert('Failed to update products');
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

  const selectedSourceData = availableSources.find(s => s.id === selectedSource);
  const selectedTypeData = INTEGRATION_TYPES.find(t => t.value === selectedType);

  const getContextDisplay = () => {
    if (storeId) return 'Site Level';
    if (companyId) return 'Company Level';
    if (conceptId) return 'Concept Level';
    return 'Global Level';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="relative z-[61] bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Integration Mapping Templates</h2>
              <p className="text-sm text-slate-600">
                Create reusable attribute mappings for each integration source and type
                {(conceptId || companyId || storeId) && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    {getContextDisplay()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Integration Source *
              </label>
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setSelectedTemplate('');
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a source...</option>
                {availableSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Integration Type *
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedTemplate('');
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {INTEGRATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {selectedTypeData && (
                <p className="text-xs text-slate-500 mt-1">{selectedTypeData.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Target Product Template *
                </div>
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={!selectedSource}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {savedMapping && (
            <div className={`mb-4 p-3 border rounded-lg flex items-start gap-3 ${
              savedMapping.is_inherited
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                savedMapping.is_inherited ? 'text-blue-600' : 'text-green-600'
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  savedMapping.is_inherited ? 'text-blue-900' : 'text-green-900'
                }`}>
                  {savedMapping.is_inherited ? 'Inherited mapping template' : 'Existing mapping template found'}
                </p>
                <p className={`text-xs mt-1 ${
                  savedMapping.is_inherited ? 'text-blue-700' : 'text-green-700'
                }`}>
                  {savedMapping.template_name} - {savedMapping.attribute_mappings.mappings.length} mappings configured
                  {savedMapping.is_inherited && ' (from parent concept)'}
                </p>
              </div>
            </div>
          )}

          {selectedSource && selectedType && selectedTemplate ? (
            <div className="flex-1 min-h-0">
              <div className="h-full grid grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {selectedSourceData?.name} {selectedTypeData?.label} Fields
                      </h3>
                      {sampleProducts.length > 1 && (
                        <select
                          value={selectedSampleIndex}
                          onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                          className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                        >
                          {sampleProducts.map((sample, index) => {
                            const displayName = sample.data?.name || sample.data?.id || `Item ${index + 1}`;
                            return (
                              <option key={index} value={index}>
                                {displayName}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Fields extracted from sample {selectedTypeData?.label.toLowerCase()} in this integration
                    </p>
                  </div>
                  <div className="flex-1 space-y-1 bg-slate-50 rounded-lg p-3 overflow-y-auto">
                    {integrationFields.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 text-amber-700 bg-amber-50 rounded border border-amber-200">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p className="text-sm">No sample products found. Import products from this source first.</p>
                      </div>
                    ) : (
                      integrationFields.map(field => {
                        const sampleValue = sampleProducts.length > 0 && sampleProducts[selectedSampleIndex]
                          ? getNestedValue(sampleProducts[selectedSampleIndex].data, field)
                          : undefined;
                        return (
                          <div key={field} className="p-2 bg-white rounded border border-slate-200 hover:border-blue-400 transition-colors">
                            <div className="text-sm font-mono text-slate-700">{field}</div>
                            <div className="text-xs text-slate-500 mt-1 truncate">
                              {typeof sampleValue === 'object' ? JSON.stringify(sampleValue) : String(sampleValue)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Wand Product Attributes
                    </h3>
                    <p className="text-xs text-slate-600">
                      Map integration fields to these product attributes
                    </p>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto">
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
                              disabled={integrationFields.length === 0}
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
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select source, type, and template to begin</p>
                <p className="text-sm mt-2">Configure a global mapping template for this integration</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-slate-600">
            {selectedSource && selectedType && selectedTemplate ? (
              <>
                Mapping template for <span className="font-medium text-slate-900">{selectedSourceData?.name}</span> - {' '}
                <span className="font-medium text-slate-900">{selectedTypeData?.label}</span>
              </>
            ) : (
              'Select source, type, and template to create a mapping'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            {savedMapping && (
              <button
                onClick={reapplyToExistingProducts}
                disabled={loading || mappings.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Update Existing Products
              </button>
            )}
            <button
              onClick={saveMapping}
              disabled={loading || mappings.length === 0 || !selectedTemplate || !selectedSource}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savedMapping?.is_inherited ? 'Save as Custom Template' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
