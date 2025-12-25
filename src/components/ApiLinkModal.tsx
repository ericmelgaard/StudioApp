import { useState, useEffect } from 'react';
import { X, Search, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ApiLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (data: any) => void;
  integrationSourceId?: string | null;
  title?: string;
  searchType?: 'product' | 'modifier' | 'discount' | 'all';
  entityType?: 'product' | 'category';
}

interface IntegrationItem {
  id: string;
  mapping_id: string;
  name: string;
  data: any;
  type: 'product' | 'modifier' | 'discount';
}

export default function ApiLinkModal({
  isOpen,
  onClose,
  onLink,
  integrationSourceId,
  title = 'Link to API',
  searchType = 'all',
  entityType = 'product'
}: ApiLinkModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'product' | 'modifier' | 'discount'>(
    searchType === 'all' ? 'product' : searchType
  );
  const [categoryMappings, setCategoryMappings] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (entityType === 'category') {
        loadCategoryMappings();
      } else if (integrationSourceId) {
        loadItems();
      }
    }
  }, [isOpen, integrationSourceId, selectedType, entityType]);

  const loadCategoryMappings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_attribute_mappings')
        .select(`
          id,
          wand_integration_source_id,
          attribute_mappings,
          wand_integration_sources!inner(
            id,
            name,
            integration_type
          )
        `)
        .not('attribute_mappings', 'is', null);

      if (error) throw error;

      const mappings: any[] = [];
      data?.forEach((mapping: any) => {
        const attrMappings = mapping.attribute_mappings;
        const categories = attrMappings?.categories || attrMappings?.groups || [];

        if (Array.isArray(categories) && categories.length > 0) {
          categories.forEach((cat: any) => {
            mappings.push({
              id: `${mapping.id}-${cat.id || cat.name}`,
              sourceId: mapping.wand_integration_source_id,
              sourceName: mapping.wand_integration_sources.name,
              integrationType: mapping.wand_integration_sources.integration_type,
              mappingId: cat.id || cat.externalId || cat.name,
              categoryName: cat.name || cat.displayName || 'Unnamed Category',
              categoryData: cat
            });
          });
        }
      });

      setCategoryMappings(mappings);
    } catch (error) {
      console.error('Failed to load category mappings:', error);
      setCategoryMappings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!integrationSourceId) return;

    setLoading(true);
    try {
      const tableName = selectedType === 'product'
        ? 'integration_products'
        : selectedType === 'modifier'
        ? 'integration_modifiers'
        : 'integration_discounts';

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('wand_source_id', integrationSourceId)
        .order('name');

      if (error) throw error;

      setItems((data || []).map(item => ({
        id: item.id,
        mapping_id: item.mapping_id || item.external_id,
        name: item.name,
        data: item.data,
        type: selectedType
      })));
    } catch (error) {
      console.error('Failed to load items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = entityType === 'category'
    ? categoryMappings.filter(item =>
        item.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mappingId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sourceName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mapping_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleLink = (item: any) => {
    if (entityType === 'category') {
      onLink({
        sourceId: item.sourceId,
        mappingId: item.mappingId,
        integrationType: item.integrationType,
        categoryName: item.categoryName
      });
    } else {
      onLink({
        mapping_id: item.mapping_id,
        integration_type: item.type
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-auto">
          {entityType === 'product' && !integrationSourceId ? (
            <div className="text-center py-4 text-slate-500">
              <p>Product must be linked to an integration source first.</p>
              <p className="text-sm mt-2">Link the product to an API before linking options.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {searchType === 'all' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedType('product')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedType === 'product'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Products
                    </button>
                    <button
                      onClick={() => setSelectedType('modifier')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedType === 'modifier'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Modifiers
                    </button>
                    <button
                      onClick={() => setSelectedType('discount')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedType === 'discount'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Discounts
                    </button>
                  </div>
                )}

                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or ID..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-4 text-slate-500">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  No items found. Try a different search or type.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredItems.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => handleLink(item)}
                      className="w-full p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors text-left group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {entityType === 'category' ? (
                            <>
                              <div className="font-medium text-slate-900 group-hover:text-blue-700">
                                {item.categoryName}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                Source: {item.sourceName}
                              </div>
                              <div className="text-sm text-slate-500">
                                ID: {item.mappingId}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium text-slate-900 group-hover:text-blue-700">
                                {item.name}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                ID: {item.mapping_id}
                              </div>
                              {item.data?.price !== undefined && (
                                <div className="text-sm text-slate-600 mt-1">
                                  Price: ${item.data.price.toFixed(2)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <Link2 className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
