import { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Unlink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CategoryLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (data: { sourceId: string; categoryName: string; integrationType: string } | null) => void;
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
  const [integrationSource, setIntegrationSource] = useState<IntegrationSource | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentSourceId) {
      loadIntegrationSource();
      loadCategories(currentSourceId);
    }
  }, [isOpen, currentSourceId]);

  async function loadIntegrationSource() {
    if (!currentSourceId) return;

    const { data } = await supabase
      .from('wand_integration_sources')
      .select('id, name, integration_type')
      .eq('id', currentSourceId)
      .single();

    if (data) {
      setIntegrationSource(data);
    }
  }

  async function loadCategories(sourceId: string) {
    setLoading(true);

    const { data: categoriesData } = await supabase
      .from('product_categories')
      .select('id, name, integration_category_id, integration_source_id, active_integration_source_id');

    const { data: linksData } = await supabase
      .from('product_categories_links')
      .select('mapping_id, category_id')
      .eq('integration_source_id', sourceId);

    if (categoriesData) {
      const linkedCategoryIds = new Set<string>();

      if (linksData) {
        linksData.forEach(link => {
          if (isChangingLink && link.category_id === currentCategoryId) {
            return;
          }
          linkedCategoryIds.add(link.category_id);
        });
      }

      const filteredCategories = categoriesData.filter(cat => {
        if (isChangingLink && cat.id === currentCategoryId) {
          return true;
        }
        if (linkedCategoryIds.has(cat.id)) {
          return false;
        }
        const hasActiveSource = cat.active_integration_source_id === sourceId;
        const hasOldSource = cat.integration_source_id === sourceId;

        return hasActiveSource || hasOldSource;
      });

      const categoryOptions: CategoryOption[] = await Promise.all(
        filteredCategories.map(async (cat) => {
          const sourceIdToUse = cat.active_integration_source_id || cat.integration_source_id;
          const categoryId = cat.integration_category_id || cat.name;

          let productCount = 0;
          if (sourceIdToUse) {
            const { count } = await supabase
              .from('integration_products')
              .select('*', { count: 'exact', head: true })
              .eq('wand_source_id', sourceIdToUse)
              .eq('data->>category', categoryId);

            productCount = count || 0;
          }

          return {
            category_name: cat.name,
            product_count: productCount
          };
        })
      );

      setCategories(categoryOptions.sort((a, b) => a.category_name.localeCompare(b.category_name)));
    }

    setLoading(false);
  }

  function handleLinkCategory(categoryName: string) {
    if (!integrationSource) return;

    onLink({
      sourceId: integrationSource.id,
      categoryName,
      integrationType: integrationSource.integration_type
    });
  }

  function handleUnlink() {
    onLink(null);
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
          {integrationSource && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">
                Linking from: <span className="font-bold">{integrationSource.name}</span> ({integrationSource.integration_type.toUpperCase()})
              </p>
            </div>
          )}

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
              {filteredCategories.map((category) => {
                const isCurrentlyLinked = category.category_name === currentMappingId;
                return (
                  <button
                    key={category.category_name}
                    onClick={() => handleLinkCategory(category.category_name)}
                    className={`w-full p-4 border rounded-lg transition-all text-left group ${
                      isCurrentlyLinked
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${
                            isCurrentlyLinked
                              ? 'text-green-900'
                              : 'text-slate-900 group-hover:text-blue-700'
                          }`}>
                            {category.category_name}
                          </h3>
                          {isCurrentlyLinked && (
                            <span className="text-xs font-medium px-2 py-1 bg-green-600 text-white rounded">
                              Currently Linked
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          isCurrentlyLinked ? 'text-green-700' : 'text-slate-500'
                        }`}>
                          {category.product_count} product{category.product_count !== 1 ? 's' : ''} in this category
                        </p>
                      </div>
                      <LinkIcon className={`w-5 h-5 ${
                        isCurrentlyLinked
                          ? 'text-green-600'
                          : 'text-slate-400 group-hover:text-blue-600'
                      }`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 bg-slate-50">
          {isChangingLink && currentMappingId && (
            <button
              onClick={handleUnlink}
              className="flex items-center gap-2 px-4 py-2 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Unlink className="w-4 h-4" />
              Unlink from API
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
