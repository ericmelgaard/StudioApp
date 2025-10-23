import { useState, useEffect } from 'react';
import { ArrowLeft, Package, RefreshCw, Search, Filter, Calendar, Database, Menu, X, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mockProducts } from '../data/mockProducts';
import ProductTile from '../components/ProductTile';

interface Product {
  mrn: string;
  external_id: string | null;
  name: string;
  description: string | null;
  price: string | null;
  calories: string | null;
  portion: string | null;
  meal_periods: Array<{ period: string; date: string }>;
  meal_stations: Array<{ station: string; station_detail: any }>;
  last_synced_at: string | null;
  image_url?: string;
}

interface ProductManagementProps {
  onBack: () => void;
}


export default function ProductManagement({ onBack }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealPeriod, setSelectedMealPeriod] = useState<string>('');
  const [selectedMealStation, setSelectedMealStation] = useState<string>('');
  const [mealPeriods, setMealPeriods] = useState<string[]>([]);
  const [mealStations, setMealStations] = useState<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('tile');

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
      p.meal_periods?.forEach(mp => periods.add(mp.period));
      p.meal_stations?.forEach(ms => stations.add(ms.station));
    });

    setMealPeriods(Array.from(periods).sort());
    setMealStations(Array.from(stations).sort());
  };

  const loadMockData = async () => {
    setSyncing(true);
    try {
      console.log('Loading mock products into database...');

      // Clear existing products
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('mrn', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('Error clearing products:', deleteError);
        throw new Error(`Failed to clear products: ${deleteError.message}`);
      }

      // Insert mock products
      const productsToInsert = mockProducts.map(item => ({
        ...item,
        last_synced_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (insertError) {
        console.error('Error inserting mock products:', insertError);
        throw new Error(`Failed to insert mock products: ${insertError.message}`);
      }

      console.log('Successfully loaded mock products!');
      alert(`Successfully loaded ${productsToInsert.length} mock products`);
      loadProducts();
    } catch (error) {
      console.error('Error loading mock products:', error);
      alert(`Failed to load mock products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const syncProducts = async () => {
    setSyncing(true);
    try {
      const apiUrl = 'https://api.wanddigital.com/services/webtrition/client/v2/platform?SapCode=27985&Venue=52814&mealPeriod=&MenuDate=2025-10-26&SourceSystem=1&Days=7&IncludeNutrition=false&includeIcons=false&IncludeAllergens=false&IncludeIngredients=false&IncludeRecipe=false';
      console.log('Fetching products from API...');
      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      console.log('Menu items count:', data.menuItems?.length || 0);

      if (data.hasError) {
        alert(`Failed to fetch products from API: ${data.error || 'Unknown error'}`);
        setSyncing(false);
        return;
      }

      const menuItems = data.menuItems || [];
      console.log('Processing', menuItems.length, 'menu items...');

      // Group items by MRN
      const productsByMrn = new Map<string, any>();

      menuItems.forEach((item: any) => {
        const mrn = item.mrn;
        if (!productsByMrn.has(mrn)) {
          productsByMrn.set(mrn, {
            mrn: item.mrn,
            external_id: item.externalId,
            string_id: item.stringId,
            name: item.name,
            source_name: item.sourceName,
            description: item.description,
            enticing_description: item.enticingDescription,
            portion: item.portion,
            calories: item.calories,
            price: item.price,
            sort_order: item.sortOrder,
            is_combo: item.isCombo,
            languages: item.languages || {},
            icons: item.icons || [],
            meal_periods: [],
            meal_stations: [],
            last_synced_at: new Date().toISOString(),
          });
        }

        const product = productsByMrn.get(mrn);

        // Add meal period if not already present
        if (item.mealPeriod && !product.meal_periods.some((mp: any) => mp.period === item.mealPeriod && mp.date === item.date)) {
          product.meal_periods.push({
            period: item.mealPeriod,
            date: item.date,
          });
        }

        // Add meal station if not already present
        if (item.mealStation && !product.meal_stations.some((ms: any) => ms.station === item.mealStation)) {
          product.meal_stations.push({
            station: item.mealStation,
            station_detail: item.mealStationDetail || {},
          });
        }
      });

      const productsToInsert = Array.from(productsByMrn.values());
      console.log('Aggregated into', productsToInsert.length, 'unique products by MRN');

      console.log('Clearing existing products...');
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('mrn', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('Error clearing products:', deleteError);
        throw new Error(`Failed to clear products: ${deleteError.message}`);
      }

      console.log('Inserting', productsToInsert.length, 'products into database in batches...');

      // Insert in batches of 100 to avoid size limits
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productsToInsert.length / batchSize)} (${batch.length} items)...`);

        const { error: insertError } = await supabase
          .from('products')
          .insert(batch);

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          throw new Error(`Failed to insert batch at index ${i}: ${insertError.message}`);
        }

        insertedCount += batch.length;
      }

      console.log('Successfully synced all products!');
      alert(`Successfully synced ${insertedCount} products`);
      loadProducts();
    } catch (error) {
      console.error('Error syncing products:', error);
      alert(`Failed to sync products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPeriod = !selectedMealPeriod ||
      product.meal_periods?.some(mp => mp.period === selectedMealPeriod);
    const matchesStation = !selectedMealStation ||
      product.meal_stations?.some(ms => ms.station === selectedMealStation);

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
                  loadMockData();
                  setSidePanelOpen(false);
                }}
                disabled={syncing}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                <div className="text-left">
                  <div className="font-semibold">{syncing ? 'Loading...' : 'Load Mock Data'}</div>
                  <div className="text-xs text-blue-100">Load sample products</div>
                </div>
              </button>

              <button
                onClick={() => {
                  syncProducts();
                  setSidePanelOpen(false);
                }}
                disabled={syncing}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                <div className="text-left">
                  <div className="font-semibold">{syncing ? 'Syncing...' : 'Sync from API'}</div>
                  <div className="text-xs text-purple-100">Fetch latest products</div>
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
            <button
              onClick={() => setSidePanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
            >
              <Menu className="w-5 h-5" />
              Actions
            </button>
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

            {products.length > 0 && products[0].last_synced_at && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Last synced: {new Date(products[0].last_synced_at).toLocaleString()}
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
                <p className="text-slate-600 mb-6">
                  {products.length === 0
                    ? 'Sync products from the API to get started'
                    : 'Try adjusting your search or filters'}
                </p>
                {products.length === 0 && (
                  <button
                    onClick={syncProducts}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync from API'}
                  </button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Meal Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Station
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Calories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Portion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.mrn} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-slate-500 mt-1 line-clamp-1">
                              {product.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 mt-1">MRN: {product.mrn}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {product.meal_periods?.map((mp, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {mp.period}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col gap-1">
                          {product.meal_stations?.map((ms, idx) => (
                            <span key={idx}>{ms.station}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {product.price ? `$${product.price}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {product.calories ? `${product.calories} cal` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {product.portion || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductTile key={product.mrn} product={product} />
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
    </div>
  );
}
