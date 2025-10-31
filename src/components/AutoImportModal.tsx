import { useState, useEffect } from 'react';
import { X, Save, Download, Sparkles, Filter, CheckCircle2, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
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
  subcategories: Array<{ id: string; name: string; count: number }>;
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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
        supabase.from('integration_sources').select('*').eq('id', sourceId).maybeSingle(),
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
    const { data } = await supabase
      .from('integration_products')
      .select('path_id, name, data')
      .eq('source_id', sourceId);

    if (data) {
      const categoryMap = new Map<string, { count: number; items: Set<string>; pathIds: Map<string, { name: string; count: number }> }>();

      data.forEach(item => {
        const displayGroupId = item.data?.displayAttribute?.displayGroupId;
        if (!displayGroupId) return;

        let category = categoryMap.get(displayGroupId);
        if (!category) {
          category = { count: 0, items: new Set(), pathIds: new Map() };
          categoryMap.set(displayGroupId, category);
        }

        const itemTitle = item.data?.displayAttribute?.itemTitle || item.name;
        category.items.add(itemTitle);
        category.count++;

        if (item.path_id) {
          const [pathCategory, pathSubcategory] = item.path_id.split('-');
          if (pathSubcategory) {
            const existingSub = category.pathIds.get(item.path_id);
            if (!existingSub) {
              category.pathIds.set(item.path_id, { name: itemTitle, count: 1 });
            } else {
              existingSub.count++;
            }
          }
        }
      });

      const cats = Array.from(categoryMap.entries()).map(([id, info]) => {
        const itemNames = Array.from(info.items).sort();
        const categoryName = itemNames.length > 0 ? itemNames[0] : `Category ${id}`;
        const displayName = itemNames.length > 1 ? `${categoryName} (+${itemNames.length - 1} more)` : categoryName;

        return {
          id,
          name: displayName,
          count: info.count,
          subcategories: Array.from(info.pathIds.entries()).map(([pathId, subInfo]) => ({
            id: pathId,
            name: subInfo.name,
            count: subInfo.count
          })).sort((a, b) => a.name.localeCompare(b.name))
        };
      }).sort((a, b) => parseInt(a.id) - parseInt(b.id));

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
      let integrationProducts: any[] = [];

      if (filterType === 'all') {
        const { data } = await supabase
          .from('integration_products')
          .select('*')
          .eq('source_id', sourceId);
        integrationProducts = data || [];
      } else if (filterType === 'category' && selectedCategories.size > 0) {
        const { data: allProducts } = await supabase
          .from('integration_products')
          .select('*')
          .eq('source_id', sourceId);

        if (allProducts) {
          const categoryArray = Array.from(selectedCategories);
          integrationProducts = allProducts.filter(product => {
            const isPathId = categoryArray.some(cat => cat.includes('-'));

            if (isPathId) {
              return categoryArray.includes(product.path_id);
            } else {
              const displayGroupId = product.data?.displayAttribute?.displayGroupId;
              return displayGroupId && categoryArray.includes(displayGroupId);
            }
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
        .eq('source_id', sourceId)
        .eq('integration_type', normalizeType(integrationType))
        .eq('is_template', true)
        .maybeSingle();

      if (!mappingData?.attribute_mappings?.mappings) {
        alert('No attribute mapping template found. Please create one first.');
        return;
      }

      const mappings = mappingData.attribute_mappings.mappings;

      const productsToImport = integrationProducts.map(intProduct => {
        const attributes: any = {};

        mappings.forEach((mapping: any) => {
          const value = getNestedValue(intProduct.data, mapping.integration_field);
          if (value !== undefined) {
            attributes[mapping.wand_field] = value;
          }
        });

        return {
          name: intProduct.data?.displayAttribute?.itemTitle || intProduct.name,
          integration_product_id: intProduct.id,
          attribute_template_id: selectedTemplate,
          attributes: attributes
        };
      });

      const { error } = await supabase.from('products').insert(productsToImport);

      if (error) {
        console.error('Error inserting products:', error);
        alert(`Failed to import products: ${error.message}`);
        return;
      }

      alert(`Successfully imported ${productsToImport.length} products`);
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

  function toggleCategory(categoryId: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  function toggleCategorySelection(categoryId: string, hasSubcategories: boolean) {
    setSelectedCategories(prev => {
      const next = new Set(prev);

      if (hasSubcategories) {
        const category = categories.find(c => c.id === categoryId);
        const allSubIds = category?.subcategories.map(s => s.id) || [];
        const allSelected = allSubIds.every(id => next.has(id));

        if (allSelected) {
          allSubIds.forEach(id => next.delete(id));
        } else {
          allSubIds.forEach(id => next.add(id));
        }
      } else {
        if (next.has(categoryId)) {
          next.delete(categoryId);
        } else {
          next.add(categoryId);
        }
      }

      return next;
    });
  }

  function isCategorySelected(categoryId: string): boolean {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return false;

    if (category.subcategories.length === 0) {
      return selectedCategories.has(categoryId);
    }

    const allSubIds = category.subcategories.map(s => s.id);
    return allSubIds.every(id => selectedCategories.has(id));
  }

  function isCategoryIndeterminate(categoryId: string): boolean {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.subcategories.length === 0) return false;

    const allSubIds = category.subcategories.map(s => s.id);
    const someSelected = allSubIds.some(id => selectedCategories.has(id));
    const allSelected = allSubIds.every(id => selectedCategories.has(id));

    return someSelected && !allSelected;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
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
                    <div className="space-y-1">
                      {categories.map(category => (
                        <div key={category.id} className="space-y-1">
                          <div className="flex items-center gap-2 py-2 px-2 hover:bg-white rounded transition-colors">
                            {category.subcategories.length > 0 && (
                              <button
                                onClick={() => toggleCategory(category.id)}
                                className="p-0.5 hover:bg-slate-200 rounded"
                              >
                                {expandedCategories.has(category.id) ? (
                                  <ChevronDown className="w-4 h-4 text-slate-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-600" />
                                )}
                              </button>
                            )}
                            {category.subcategories.length === 0 && <div className="w-5" />}
                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isCategorySelected(category.id)}
                                ref={(el) => {
                                  if (el) el.indeterminate = isCategoryIndeterminate(category.id);
                                }}
                                onChange={() => toggleCategorySelection(category.id, category.subcategories.length > 0)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm font-medium text-slate-700">
                                {category.name}
                              </span>
                              <span className="text-xs text-slate-500">({category.count} items)</span>
                            </label>
                          </div>

                          {expandedCategories.has(category.id) && category.subcategories.length > 0 && (
                            <div className="ml-9 space-y-1">
                              {category.subcategories.map(subcategory => (
                                <label
                                  key={subcategory.id}
                                  className="flex items-center gap-2 py-1.5 px-2 hover:bg-white rounded cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCategories.has(subcategory.id)}
                                    onChange={() => toggleCategorySelection(subcategory.id, false)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />
                                  <span className="text-sm text-slate-600">{subcategory.name}</span>
                                  <span className="text-xs text-slate-400">({subcategory.count})</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
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
