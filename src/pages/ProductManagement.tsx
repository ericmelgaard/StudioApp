import { useState, useEffect } from 'react';
import { ArrowLeft, Package, RefreshCw, Search, Filter, Calendar, Menu, X, LayoutGrid, List, Plus, Settings, Link2, FolderTree } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { supabase } from '../lib/supabase';
import { resolveProductAttributes } from '../lib/attributeResolver';
import { checkAndApplyPendingPublications } from '../lib/publicationService';
import { useLocation } from '../hooks/useLocation';
import { LocationProductService } from '../lib/locationProductService';
import ProductTile from '../components/ProductTile';
import CreateProductModal from '../components/CreateProductModal';
import EditProductModal from '../components/EditProductModal';
import AttributeTemplateManager from '../components/AttributeTemplateManager';
import IntegrationProductMapper from '../components/IntegrationProductMapper';
import CategoryManagementModal from '../components/CategoryManagementModal';
import BulkCategoryAssignModal from '../components/BulkCategoryAssignModal';
import AdvancedFilter, { FilterSection, FilterState } from '../components/AdvancedFilter';
import ProductListView from '../components/ProductListView';
import ProductHierarchyModal from '../components/ProductHierarchyModal';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  attribute_overrides?: Record<string, boolean>;
  attribute_mappings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  integration_source_name?: string;
}

interface ProductManagementProps {
  onBack?: () => void;
  showBackButton?: boolean;
}


export default function ProductManagement({ onBack, showBackButton = true }: ProductManagementProps) {
  const { location } = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSections, setFilterSections] = useState<FilterSection[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('tile');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showMapper, setShowMapper] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showBulkCategoryAssign, setShowBulkCategoryAssign] = useState(false);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);

  useEffect(() => {
    checkAndApplyPendingPublications().then(() => {
      loadProducts();
    }).catch(err => {
      console.error('Error checking pending publications:', err);
      loadProducts();
    });
  }, [location]);

  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('*, policy_status, last_policy_check')
      .is('parent_product_id', null)
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
      setLoading(false);
      return;
    }

    let productsData = data || [];

    if (location.store || location.company || location.concept) {
      const conceptId = location.concept?.id || null;
      const companyId = location.company?.id || null;
      const siteId = location.store?.id || null;

      const parentIds = productsData.map(p => p.id);

      let query = supabase
        .from('products')
        .select('*')
        .in('parent_product_id', parentIds);

      if (conceptId !== null) {
        query = query.eq('concept_id', conceptId);
      } else {
        query = query.is('concept_id', null);
      }

      if (companyId !== null) {
        query = query.eq('company_id', companyId);
      } else {
        query = query.is('company_id', null);
      }

      if (siteId !== null) {
        query = query.eq('site_id', siteId);
      } else {
        query = query.is('site_id', null);
      }

      const { data: locationProducts } = await query;

      if (locationProducts && locationProducts.length > 0) {
        const locationProductMap = new Map(
          locationProducts.map(p => [p.parent_product_id, p])
        );

        productsData = productsData.map(product => {
          const locationProduct = locationProductMap.get(product.id);
          return locationProduct || product;
        });
      }
    }

    const integrationProductIds = productsData
      .filter(p => p.integration_product_id)
      .map(p => p.integration_product_id);

    let integrationDataMap = new Map();
    let integrationSourceMap = new Map();

    if (integrationProductIds.length > 0) {
      const { data: integrationData, error: intError } = await supabase
        .from('integration_products')
        .select('id, data, wand_source_id, wand_integration_sources(name)')
        .in('id', integrationProductIds);

      if (!intError && integrationData) {
        integrationData.forEach(ip => {
          integrationDataMap.set(ip.id, ip.data);
          if ((ip as any).wand_integration_sources) {
            integrationSourceMap.set(ip.id, (ip as any).wand_integration_sources.name);
          }
        });
      }
    }

    const resolvedProducts = await Promise.all(
      productsData.map(async product => {
        const sourceName = product.integration_product_id
          ? integrationSourceMap.get(product.integration_product_id)
          : undefined;

        const resolvedProduct = await LocationProductService.resolveProductWithInheritance(
          product,
          integrationDataMap
        );

        return {
          ...resolvedProduct,
          integration_source_name: sourceName
        };
      })
    );

    setProducts(resolvedProducts);
    extractFilters(resolvedProducts);
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

    const sections: FilterSection[] = [];

    if (periods.size > 0) {
      sections.push({
        id: 'periods',
        label: 'Meal Periods',
        options: Array.from(periods).sort().map(p => ({ value: p, label: p }))
      });
    }

    if (stations.size > 0) {
      sections.push({
        id: 'stations',
        label: 'Meal Stations',
        options: Array.from(stations).sort().map(s => ({ value: s, label: s }))
      });
    }

    setFilterSections(sections);
    setFilterState({
      periods: [],
      stations: []
    });
  };



  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.attributes?.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const selectedPeriods = filterState.periods || [];
    const selectedStations = filterState.stations || [];

    const mealPeriods = product.attributes?.meal_periods;
    const mealStations = product.attributes?.meal_stations;

    const matchesPeriod = selectedPeriods.length === 0 ||
      (Array.isArray(mealPeriods) && mealPeriods.some((mp: any) => selectedPeriods.includes(mp.period)));

    const matchesStation = selectedStations.length === 0 ||
      (Array.isArray(mealStations) && mealStations.some((ms: any) => selectedStations.includes(ms.station)));

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
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out ${
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

              <button
                onClick={() => {
                  setShowCategoryManager(true);
                  setSidePanelOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <FolderTree className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Manage Categories</div>
                  <div className="text-xs text-green-100">Create and organize product categories</div>
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Product Management</h1>
                {showBackButton ? (
                  <p className="text-xs text-slate-500">
                    {products.length} products in catalog
                  </p>
                ) : (
                  <Breadcrumb
                    items={[
                      ...(location.concept ? [{ label: location.concept.name }] : []),
                      ...(location.company ? [{ label: location.company.name }] : []),
                      ...(location.store ? [{ label: location.store.name }] : []),
                      ...(!location.concept && !location.company && !location.store ? [{ label: 'All Locations' }] : [])
                    ]}
                  />
                )}
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
                    onClick={() => {
                      setViewMode('tile');
                      setSelectedProductIds(new Set());
                    }}
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

                <AdvancedFilter
                  sections={filterSections}
                  value={filterState}
                  onChange={setFilterState}
                />
              </div>
            </div>

            <div className="mt-4 h-6 flex items-center gap-2 text-sm text-slate-600">
              {selectedProductIds.size > 0 ? (
                <>
                  <button
                    onClick={() => setSelectedProductIds(new Set())}
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-slate-700">
                    Selected {selectedProductIds.size} of {filteredProducts.length}
                  </span>
                  <div className="w-px h-4 bg-slate-300" />
                  <button
                    onClick={() => setShowBulkCategoryAssign(true)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Add to category
                  </button>
                  <button
                    onClick={() => setShowHierarchyModal(true)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View Customizations
                  </button>
                </>
              ) : products.length > 0 && products[0].updated_at ? (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>
                    Last updated: {new Date(products[0].updated_at).toLocaleString()}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className={viewMode === 'tile' ? 'p-6' : ''}>
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
              <div className="p-6">
                <ProductListView
                  products={filteredProducts}
                  onProductClick={(product) => {
                    setSelectedProduct(product);
                    setShowEditModal(true);
                  }}
                  selectedProductIds={selectedProductIds}
                  onSelectionChange={setSelectedProductIds}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  advancedFilterComponent={
                    <AdvancedFilter
                      sections={filterSections}
                      value={filterState}
                      onChange={setFilterState}
                    />
                  }
                  conceptId={location.concept?.id}
                  companyId={location.company?.id}
                  siteId={location.store?.id}
                  onProductsRefresh={loadProducts}
                  onShowHierarchy={() => setShowHierarchyModal(true)}
                  onShowCategoryAssign={() => setShowBulkCategoryAssign(true)}
                  totalProductCount={filteredProducts.length}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    onClick={async () => {
                      let productToEdit = product;

                      if (!product.parent_product_id && (location.concept || location.company || location.store)) {
                        const locationProduct = await LocationProductService.getOrCreateLocationProduct(
                          product.id,
                          location
                        );
                        if (locationProduct) {
                          productToEdit = locationProduct;
                        }
                      }

                      setSelectedProduct(productToEdit);
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
        conceptId={location.concept?.id}
        companyId={location.company?.id}
        storeId={location.store?.id}
      />

      <CategoryManagementModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />

      <BulkCategoryAssignModal
        isOpen={showBulkCategoryAssign}
        onClose={() => setShowBulkCategoryAssign(false)}
        productIds={Array.from(selectedProductIds)}
        onSuccess={() => {
          setSelectedProductIds(new Set());
          loadProducts();
        }}
      />

      <ProductHierarchyModal
        isOpen={showHierarchyModal}
        onClose={() => setShowHierarchyModal(false)}
        productIds={Array.from(selectedProductIds)}
        conceptId={location.concept?.id}
        companyId={location.company?.id}
        siteId={location.store?.id}
      />
    </div>
  );
}
