import { useEffect, useState } from 'react';
import { Search, Package, Tag, Percent, DollarSign, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

type IntegrationType = 'products' | 'modifiers' | 'discounts';

interface IntegrationSource {
  id: string;
  name: string;
  type: string;
}

interface IntegrationProduct {
  id: string;
  external_id: string;
  name: string;
  path_id: string;
  item_type: string;
  data: any;
  last_synced_at: string;
}

interface IntegrationModifier {
  id: string;
  external_id: string;
  name: string;
  path_id: string;
  modifier_group_name: string;
  data: any;
  last_synced_at: string;
}

interface IntegrationDiscount {
  id: string;
  external_id: string;
  name: string;
  discount_amount: number;
  data: any;
  last_synced_at: string;
}

export default function IntegrationCatalog() {
  const [activeTab, setActiveTab] = useState<IntegrationType>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [source, setSource] = useState<IntegrationSource | null>(null);
  const [products, setProducts] = useState<IntegrationProduct[]>([]);
  const [modifiers, setModifiers] = useState<IntegrationModifier[]>([]);
  const [discounts, setDiscounts] = useState<IntegrationDiscount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSource();
  }, []);

  useEffect(() => {
    if (source) {
      loadData();
    }
  }, [activeTab, source]);

  async function loadSource() {
    const { data } = await supabase
      .from('integration_sources')
      .select('*')
      .maybeSingle();

    if (data) {
      setSource(data);
    }
  }

  async function loadData() {
    setLoading(true);

    if (activeTab === 'products') {
      const { data } = await supabase
        .from('integration_products')
        .select('*')
        .eq('source_id', source!.id)
        .order('name');
      setProducts(data || []);
    } else if (activeTab === 'modifiers') {
      const { data } = await supabase
        .from('integration_modifiers')
        .select('*')
        .eq('source_id', source!.id)
        .order('name');
      setModifiers(data || []);
    } else if (activeTab === 'discounts') {
      const { data } = await supabase
        .from('integration_discounts')
        .select('*')
        .eq('source_id', source!.id)
        .order('name');
      setDiscounts(data || []);
    }

    setLoading(false);
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModifiers = modifiers.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.modifier_group_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDiscounts = discounts.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrice = (item: any) => {
    const price = item.data?.prices?.prices?.[0]?.price ||
                  item.data?.priceAttribute?.prices?.[0]?.price;
    return price ? `$${price.toFixed(2)}` : 'N/A';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Integration Catalog</h1>
          <p className="text-slate-600">
            Browse products, modifiers, and discounts from external integrations
          </p>
          {source && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <Package className="w-4 h-4" />
              {source.name}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-2 font-medium transition-colors relative ${
                  activeTab === 'products'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Products
                  <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                    {products.length}
                  </span>
                </div>
                {activeTab === 'products' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('modifiers')}
                className={`py-4 px-2 font-medium transition-colors relative ${
                  activeTab === 'modifiers'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Modifiers
                  <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                    {modifiers.length}
                  </span>
                </div>
                {activeTab === 'modifiers' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('discounts')}
                className={`py-4 px-2 font-medium transition-colors relative ${
                  activeTab === 'discounts'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Discounts
                  <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                    {discounts.length}
                  </span>
                </div>
                {activeTab === 'discounts' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="mt-4 text-slate-600">Loading {activeTab}...</p>
              </div>
            ) : (
              <>
                {activeTab === 'products' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-slate-900 line-clamp-1">
                            {product.data?.displayAttribute?.itemTitle || product.name}
                          </h3>
                          <span className="text-lg font-bold text-blue-600 ml-2">
                            {getPrice(product)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                          {product.data?.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            ID: {product.external_id}
                          </div>
                          {product.data?.isOutOfStock && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'modifiers' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredModifiers.map((modifier) => (
                      <div
                        key={modifier.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-slate-900 line-clamp-1">
                            {modifier.data?.displayAttribute?.itemTitle || modifier.name}
                          </h3>
                          <span className="text-lg font-bold text-blue-600 ml-2">
                            {getPrice(modifier)}
                          </span>
                        </div>
                        {modifier.modifier_group_name && (
                          <div className="mb-2 inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                            <Tag className="w-3 h-3" />
                            {modifier.modifier_group_name}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            ID: {modifier.external_id}
                          </div>
                          {modifier.data?.isOutOfStock && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'discounts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDiscounts.map((discount) => (
                      <div
                        key={discount.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-slate-900 line-clamp-1">
                            {discount.name}
                          </h3>
                          {discount.discount_amount && (
                            <span className="text-lg font-bold text-green-600 ml-2 flex items-center gap-0.5">
                              <DollarSign className="w-4 h-4" />
                              {discount.discount_amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Tag className="w-3 h-3" />
                          ID: {discount.external_id}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {((activeTab === 'products' && filteredProducts.length === 0) ||
                  (activeTab === 'modifiers' && filteredModifiers.length === 0) ||
                  (activeTab === 'discounts' && filteredDiscounts.length === 0)) && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      No {activeTab} found{searchTerm && ' matching your search'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Integration Catalog</h3>
              <p className="text-sm text-blue-700">
                This catalog displays external product data from your POS or other integrations.
                Use this data to create or map to your internal WAND products.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
