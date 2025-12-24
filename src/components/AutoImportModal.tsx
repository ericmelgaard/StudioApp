import { useState, useEffect } from 'react';
import { X, Save, Download, Sparkles, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IntegrationSource {
  id: string;
  name: string;
  type: string;
}

interface AttributeTemplate {
  id: string;
  name: string;
}

interface CategoryNode {
  id: string;
  name: string;
  count: number;
}

interface AutoImportRule {
  id?: string;
  source_id: string;
  integration_type: string;
  filter_type: string;
  filter_value: string | null;
  target_template_id: string;
  is_active: boolean;
}

interface AutoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourceId: string;
  integrationType: 'products' | 'modifiers' | 'discounts';
}

const INTEGRATION_TYPES: Record<string, string> = {
  product: 'Products',
  products: 'Products',
  modifier: 'Modifiers',
  modifiers: 'Modifiers',
  discount: 'Discounts',
  discounts: 'Discounts'
};

export default function AutoImportModal({
  isOpen,
  onClose,
  onSuccess,
  sourceId,
  integrationType
}: AutoImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [source, setSource] = useState<IntegrationSource | null>(null);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  const [filterType, setFilterType] = useState<'all' | 'category'>('all');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [existingRule, setExistingRule] = useState<AutoImportRule | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadExistingRule();
    }
  }, [isOpen, sourceId, integrationType]);


  async function loadData() {
    setLoading(true);
    try {
      const [sourceRes, templatesRes, orgSettingsRes] = await Promise.all([
        supabase.from('wand_integration_sources').select('id, name, integration_type as type').eq('id', sourceId).maybeSingle(),
        supabase.from('product_attribute_templates').select('id, name').order('name'),
        supabase.from('organization_settings').select('default_product_attribute_template_id').limit(1).maybeSingle()
      ]);

      if (sourceRes.data) setSource(sourceRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);

      if (orgSettingsRes.data?.default_product_attribute_template_id) {
        setSelectedTemplate(orgSettingsRes.data.default_product_attribute_template_id);
      } else if (templatesRes.data && templatesRes.data.length > 0) {
        setSelectedTemplate(templatesRes.data[0].id);
      }

      await loadCategories();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    let tableName = 'integration_products';
    if (integrationType === 'modifiers') {
      tableName = 'integration_modifiers';
    } else if (integrationType === 'discounts') {
      tableName = 'integration_discounts';
    }

    const { data } = await supabase
      .from(tableName)
      .select('name, data')
      .eq('wand_source_id', sourceId);

    if (data) {
      const categoryMap = new Map<string, number>();

      data.forEach(item => {
        const category = item.data?.category;
        const categoryId = item.data?.categoryId;

        if (!category || !categoryId) return;

        const count = categoryMap.get(categoryId) || 0;
        categoryMap.set(categoryId, count + 1);
      });

      const cats = Array.from(categoryMap.entries()).map(([id, count]) => {
        const firstItem = data.find(item => item.data?.categoryId === id);
        const categoryName = firstItem?.data?.category || `Category ${id}`;

        return {
          id,
          name: categoryName,
          count
        };
      }).sort((a, b) => b.count - a.count);

      setCategories(cats);
    }
  }

  function normalizeType(type: string): string {
    return type.replace(/s$/, '');
  }

  async function loadExistingRule() {
    const { data } = await supabase
      .from('integration_auto_import_rules')
      .select('*')
      .eq('source_id', sourceId)
      .eq('integration_type', normalizeType(integrationType))
      .maybeSingle();

    if (data) {
      setExistingRule(data);
      setFilterType(data.filter_type);
      if (data.filter_type === 'category' && data.filter_value) {
        try {
          const categories = JSON.parse(data.filter_value);
          setSelectedCategories(new Set(categories));
        } catch {
          setSelectedCategories(new Set());
        }
      }
      setSelectedTemplate(data.target_template_id);
    }
  }

  async function saveRule() {
    if (!selectedTemplate) {
      alert('Please select a target template');
      return;
    }

    if (filterType === 'category' && selectedCategories.size === 0) {
      alert('Please select at least one category');
      return;
    }

    setLoading(true);
    try {
      const ruleData = {
        source_id: sourceId,
        integration_type: normalizeType(integrationType),
        filter_type: filterType,
        filter_value: filterType === 'all' ? null : JSON.stringify(Array.from(selectedCategories)),
        target_template_id: selectedTemplate,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      if (existingRule) {
        await supabase
          .from('integration_auto_import_rules')
          .update(ruleData)
          .eq('id', existingRule.id);
      } else {
        await supabase
          .from('integration_auto_import_rules')
          .insert(ruleData);
      }

      alert('Auto-import rule saved successfully');
      await loadExistingRule();
      onSuccess();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save auto-import rule');
    } finally {
      setLoading(false);
    }
  }

  async function runImport() {
    if (!selectedTemplate) {
      alert('Please save the rule first');
      return;
    }

    setImporting(true);
    try {
      let tableName = 'integration_products';
      if (integrationType === 'modifiers') {
        tableName = 'integration_modifiers';
      } else if (integrationType === 'discounts') {
        tableName = 'integration_discounts';
      }

      let integrationProducts: any[] = [];

      if (filterType === 'all') {
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .eq('wand_source_id', sourceId);
        integrationProducts = data || [];
      } else if (filterType === 'category' && selectedCategories.size > 0) {
        const { data: allProducts } = await supabase
          .from(tableName)
          .select('*')
          .eq('wand_source_id', sourceId);

        if (allProducts) {
          const categoryArray = Array.from(selectedCategories);
          integrationProducts = allProducts.filter(product => {
            const categoryId = product.data?.categoryId;
            return categoryId && categoryArray.includes(categoryId);
          });
        }
      }

      if (!integrationProducts || integrationProducts.length === 0) {
        alert('No products found matching the filter');
        return;
      }

      const { data: mappingData } = await supabase
        .from('integration_attribute_mappings')
        .select('attribute_mappings')
        .eq('wand_integration_source_id', sourceId)
        .eq('integration_type', normalizeType(integrationType))
        .eq('is_template', true)
        .maybeSingle();

      if (!mappingData?.attribute_mappings?.mappings) {
        alert('No attribute mapping template found. Please create one first.');
        return;
      }

      const mappings = mappingData.attribute_mappings.mappings;

      const integrationProductIds = integrationProducts.map(p => p.id);

      const { data: existingProducts } = await supabase
        .from('products')
        .select('integration_product_id')
        .in('integration_product_id', integrationProductIds);

      const existingProductIds = new Set(
        (existingProducts || []).map(p => p.integration_product_id)
      );

      const productsToImport = integrationProducts
        .filter(intProduct => !existingProductIds.has(intProduct.id))
        .map(intProduct => {
          const attributes: any = {};
          const attributeMappings: any = {};

          mappings.forEach((mapping: any) => {
            const value = getNestedValue(intProduct.data, mapping.integration_field);
            if (value !== undefined) {
              attributes[mapping.wand_field] = value;
              // Create product-level mapping so field will sync from integration
              attributeMappings[mapping.wand_field] = mapping.integration_field;
            }
          });

          return {
            name: intProduct.name,
            integration_product_id: intProduct.id,
            attribute_template_id: selectedTemplate,
            attributes: attributes,
            attribute_mappings: attributeMappings
          };
        });

      if (productsToImport.length === 0) {
        alert('All selected products have already been imported. No new products to add.');
        return;
      }

      const { error } = await supabase.from('products').insert(productsToImport);

      if (error) {
        console.error('Error inserting products:', error);
        alert(`Failed to import products: ${error.message}`);
        return;
      }

      const skippedCount = integrationProducts.length - productsToImport.length;
      const message = skippedCount > 0
        ? `Successfully imported ${productsToImport.length} products (${skippedCount} duplicates skipped)`
        : `Successfully imported ${productsToImport.length} products`;

      alert(message);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Failed to import products');
    } finally {
      setImporting(false);
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

  function toggleCategorySelection(categoryId: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-[201]">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Auto-Import {INTEGRATION_TYPES[integrationType]}</h2>
              <p className="text-sm text-blue-100">Configure automatic product import rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {existingRule && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Auto-import rule configured</p>
                <p className="text-xs text-green-700 mt-1">
                  {existingRule.is_active ? 'Active' : 'Inactive'} - Last updated: {new Date(existingRule.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Import Filter
              </div>
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="filterType"
                  value="all"
                  checked={filterType === 'all'}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">Import All</div>
                  <div className="text-xs text-slate-500">Import all {INTEGRATION_TYPES[integrationType].toLowerCase()} from this source</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="filterType"
                  value="category"
                  checked={filterType === 'category'}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">Import by Category</div>
                  <div className="text-xs text-slate-500">Select one or more categories to import</div>
                </div>
              </label>

              {filterType === 'category' && (
                <div className="ml-7 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-80 overflow-y-auto">
                  {categories.length === 0 ? (
                    <p className="text-sm text-slate-500">No categories available</p>
                  ) : (
                    <div className="space-y-2">
                      {categories.map(category => (
                        <label
                          key={category.id}
                          className="flex items-center gap-3 py-2 px-3 hover:bg-white rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(category.id)}
                            onChange={() => toggleCategorySelection(category.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-700">
                              {category.name}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">({category.count} items)</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Target Product Template
              </div>
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Imported products will use this template's attribute structure
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Before importing:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Ensure attribute mapping template is configured</li>
                  <li>Review the filter to avoid importing unwanted items</li>
                  <li>Products will be created using the mapped attributes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={saveRule}
              disabled={loading || !selectedTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Rule
            </button>
            <button
              onClick={runImport}
              disabled={importing || !selectedTemplate || loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
