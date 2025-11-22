import { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CategoryLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (data: { sourceId: string; categoryName: string; integrationType: string }) => void;
  currentSourceId?: string;
  currentCategoryId?: string;
  currentMappingId?: string;
  isChangingLink?: boolean;
}

interface IntegrationSource {
  id: string;
  name: string;
  integration_type: string;
}

interface CategoryOption {
  category_name: string;
  product_count: number;
}

export default function CategoryLinkModal({
  isOpen,
  onClose,
  onLink,
  currentSourceId,
  currentCategoryId,
  currentMappingId,
  isChangingLink = false
}: CategoryLinkModalProps) {
  const [integrationSources, setIntegrationSources] = useState<IntegrationSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadIntegrationSources();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSource) {
      loadCategories(selectedSource);
    } else {
      setCategories([]);
    }
  }, [selectedSource]);

  async function loadIntegrationSources() {
    const { data } = await supabase
      .from('wand_integration_sources')
      .select('id, name, integration_type')
      .eq('status', 'active')
      .order('name');

    if (data) {
      setIntegrationSources(data);
      if (currentSourceId) {
        setSelectedSource(currentSourceId);
      }
    }
  }

  async function loadCategories(sourceId: string) {
    setLoading(true);

    const { data: productsData } = await supabase
      .from('integration_products')
      .select('data')
      .eq('wand_source_id', sourceId);

    const { data: linksData } = await supabase
      .from('product_categories_links')
      .select('mapping_id, category_id')
      .eq('integration_source_id', sourceId);

    const { data: categoriesData } = await supabase
      .from('product_categories')
      .select('id, integration_category_id')
      .eq('active_integration_source_id', sourceId);

    if (productsData) {
      const categoryCounts = productsData.reduce((acc: Record<string, number>, item: any) => {
        const name = item.data?.category || '';
        if (name) {
          acc[name] = (acc[name] || 0) + 1;
        }
        return acc;
      }, {});

      const linkedCategoryNames = new Set<string>();

      if (linksData) {
        linksData.forEach(link => {
          if (isChangingLink && link.category_id === currentCategoryId) {
            return;
          }
          linkedCategoryNames.add(link.mapping_id);
        });
      }

      if (categoriesData) {
        categoriesData.forEach(cat => {
          if (isChangingLink && cat.id === currentCategoryId) {
            return;
          }
          if (cat.integration_category_id) {
            linkedCategoryNames.add(cat.integration_category_id);
          }
        });
      }

      const categoryOptions: CategoryOption[] = Object.entries(categoryCounts)
        .filter(([category_name]) => {
          if (isChangingLink && category_name === currentMappingId) {
            return true;
          }
          return !linkedCategoryNames.has(category_name);
        })
        .map(([category_name, product_count]) => ({
          category_name,
          product_count: product_count as number
        }))
        .sort((a, b) => a.category_name.localeCompare(b.category_name));

      setCategories(categoryOptions);
    }

    setLoading(false);
  }

  function handleLinkCategory(categoryName: string) {
    const source = integrationSources.find(s => s.id === selectedSource);
    if (!source) return;

    onLink({
      sourceId: selectedSource,
      categoryName,
      integrationType: source.integration_type
    });
  }

  const filteredCategories = categories.filter(cat =>
    cat.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Link Category to API Source</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select a category from imported products to link
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Integration Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a source...</option>
              {integrationSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.integration_type})
                </option>
              ))}
            </select>
          </div>

          {selectedSource && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  Loading categories...
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {searchTerm
                    ? 'No categories found matching your search'
                    : 'No categories found in this integration source'}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCategories.map((category) => (
                    <button
                      key={category.category_name}
                      onClick={() => handleLinkCategory(category.category_name)}
                      className="w-full p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">
                            {category.category_name}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {category.product_count} product{category.product_count !== 1 ? 's' : ''} in this category
                          </p>
                        </div>
                        <LinkIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
