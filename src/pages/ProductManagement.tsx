import { useState, useEffect } from 'react';
import { ArrowLeft, Package, RefreshCw, Search, Filter, Calendar, Menu, X, LayoutGrid, List, Plus, Settings, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductTile from '../components/ProductTile';
import CreateProductModal from '../components/CreateProductModal';
import EditProductModal from '../components/EditProductModal';
import AttributeTemplateManager from '../components/AttributeTemplateManager';
import IntegrationProductMapper from '../components/IntegrationProductMapper';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductManagementProps {
  onBack: () => void;
}


export default function ProductManagement({ onBack }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealPeriod, setSelectedMealPeriod] = useState<string>('');
  const [selectedMealStation, setSelectedMealStation] = useState<string>('');
  const [mealPeriods, setMealPeriods] = useState<string[]>([]);
  const [mealStations, setMealStations] = useState<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('tile');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showMapper, setShowMapper] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(data || []);
      extractFilters(data || []);
    }
    setLoading(false);
  };

  const extractFilters = (products: Product[]) => {
    const periods = new Set<string>();
    const stations = new Set<string>();

    products.forEach(p => {
      const mealPeriods = p.attributes?.meal_periods;
      const mealStations = p.attributes?.meal_stations;

      if (Array.isArray(mealPeriods)) {
        mealPeriods.forEach((mp: any) => periods.add(mp.period));
      }

      if (Array.isArray(mealStations)) {
        mealStations.forEach((ms: any) => stations.add(ms.station));
      }
    });

    setMealPeriods(Array.from(periods).sort());
    setMealStations(Array.from(stations).sort());
  };



  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.attributes?.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const mealPeriods = product.attributes?.meal_periods;
    const mealStations = product.attributes?.meal_stations;

    const matchesPeriod = !selectedMealPeriod ||
      (Array.isArray(mealPeriods) && mealPeriods.some((mp: any) => mp.period === selectedMealPeriod));

    const matchesStation = !selectedMealStation ||
      (Array.isArray(mealStations) && mealStations.some((ms: any) => ms.station === selectedMealStation));

    return matchesSearch && matchesPeriod && matchesStation;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Side Panel Overlay */}
      {sidePanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setSidePanelOpen(false)}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          sidePanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Actions</h2>
            <button
              onClick={() => setSidePanelOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowMapper(true);
                  setSidePanelOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <Link2 className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Map Integration Products</div>
                  <div className="text-xs text-blue-100">Link integration data to products</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowTemplateManager(true);
                  setSidePanelOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <Settings className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Manage Templates</div>
                  <div className="text-xs text-purple-100">Set default attribute template</div>
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Product Management</h1>
                <p className="text-xs text-slate-500">
                  {products.length} products in catalog
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Product
              </button>
              <button
                onClick={() => setSidePanelOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
              >
                <Menu className="w-5 h-5" />
                Actions
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('tile')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'tile'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Tile view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedMealPeriod}
                    onChange={(e) => setSelectedMealPeriod(e.target.value)}
                    className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">All Periods</option>
                    {mealPeriods.map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedMealStation}
                    onChange={(e) => setSelectedMealStation(e.target.value)}
                    className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">All Stations</option>
                    {mealStations.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {products.length > 0 && products[0].updated_at && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Last updated: {new Date(products[0].updated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className={viewMode === 'tile' ? 'p-6' : 'overflow-x-auto'}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {products.length === 0 ? 'No products yet' : 'No products found'}
                </h3>
                <p className="text-slate-600">
                  {products.length === 0
                    ? 'Load sample data to get started, or manage integrations to sync products from external sources'
                    : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Attributes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Template
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{product.name}</div>
                          {product.attributes?.description && (
                            <div className="text-sm text-slate-500 mt-1 line-clamp-1">
                              {product.attributes.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 mt-1">ID: {product.id.slice(0, 8)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 space-y-1">
                          {product.attributes?.price && (
                            <div>Price: ${product.attributes.price}</div>
                          )}
                          {product.attributes?.calories && (
                            <div>Calories: {product.attributes.calories}</div>
                          )}
                          {product.attributes?.portion && (
                            <div>Portion: {product.attributes.portion}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {product.attribute_template_id ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Has Template
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowEditModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {!loading && filteredProducts.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            </div>
          )}
        </div>
      </main>

      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadProducts}
      />

      <EditProductModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={loadProducts}
      />

      <AttributeTemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
      />

      <IntegrationProductMapper
        isOpen={showMapper}
        onClose={() => setShowMapper(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
}
