import { useState, useEffect } from 'react';
import { Package, RefreshCw, Search, Filter, Calendar, Menu, X, LayoutGrid, List, Plus, Settings, Link2, FolderTree } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { supabase } from '../lib/supabase';
import { resolveProductAttributes } from '../lib/attributeResolver';
import { checkAndApplyPendingPublications } from '../lib/publicationService';
import { useLocation } from '../hooks/useLocation';
import { useCurrentUser } from '../contexts/UserContext';
import { LocationProductService } from '../lib/locationProductService';
import ProductTile from '../components/ProductTile';
import ProductEdit from './ProductEdit';
import AttributeTemplateManager from '../components/AttributeTemplateManager';
import IntegrationProductMapper from '../components/IntegrationProductMapper';
import CategoryManagementModal from '../components/CategoryManagementModal';
import BulkCategoryAssignModal from '../components/BulkCategoryAssignModal';
import AdvancedFilter, { FilterSection, FilterState } from '../components/AdvancedFilter';
import ProductListView from '../components/ProductListView';
import ProductHierarchyModal from '../components/ProductHierarchyModal';
import { getProductType, ProductType } from '../lib/productTypeUtils';

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
  mapping_id?: string | null;
  local_fields?: string[];
  productType?: ProductType;
}

interface ProductManagementProps {
  onBack?: () => void;
  showBackButton?: boolean;
}


export default function ProductManagement({ onBack, showBackButton = true }: ProductManagementProps) {
  const { location, setLocation } = useLocation();
  const { user } = useCurrentUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSections, setFilterSections] = useState<FilterSection[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('tile');
  const [viewLevel, setViewLevel] = useState<'list' | 'product-create' | 'product-edit'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showMapper, setShowMapper] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showBulkCategoryAssign, setShowBulkCategoryAssign] = useState(false);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [productCategoryMap, setProductCategoryMap] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    checkAndApplyPendingPublications().then(() => {
      loadProducts();
    }).catch(err => {
      console.error('Error checking pending publications:', err);
      loadProducts();
    });
  }, [location, user]);

  const loadProducts = async () => {
    setLoading(true);

    const conceptId = location.concept?.id || null;
    const companyId = location.company?.id || null;
    const siteId = location.store?.id || null;
    const isAdmin = user?.role === 'admin';

    let parentQuery = supabase
      .from('products')
      .select('*, policy_status, last_policy_check')
      .is('parent_product_id', null);

    // Admins see all products regardless of location
    // Operators and creators see only products for their selected location
    if (!isAdmin) {
      if (siteId !== null) {
        parentQuery = parentQuery.eq('site_id', siteId);
      } else if (companyId !== null) {
        parentQuery = parentQuery.eq('company_id', companyId);
      } else if (conceptId !== null) {
        parentQuery = parentQuery.eq('concept_id', conceptId);
      }
    }

    parentQuery = parentQuery.order('name');

    const { data, error } = await parentQuery;

    if (error) {
      console.error('Error loading products:', error);
      setLoading(false);
      return;
    }

    let productsData = data || [];

    if (location.store || location.company || location.concept) {

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

    const { data: categoryAssignments } = await supabase
      .from('product_category_assignments')
      .select('product_id, category_id');

    const categoryMap = new Map<string, string[]>();
    if (categoryAssignments) {
      categoryAssignments.forEach(assignment => {
        const existing = categoryMap.get(assignment.product_id) || [];
        existing.push(assignment.category_id);
        categoryMap.set(assignment.product_id, existing);
      });
    }
    setProductCategoryMap(categoryMap);

    setProducts(resolvedProducts);
    extractFilters(resolvedProducts);
    setLoading(false);
  };

  const extractFilters = async (products: Product[]) => {
    const periods = new Set<string>();
    const stations = new Set<string>();
    const typeCounts = { custom: 0, imported: 0, linked: 0 };

    products.forEach(p => {
      const mealPeriods = p.attributes?.meal_periods;
      const mealStations = p.attributes?.meal_stations;

      if (Array.isArray(mealPeriods)) {
        mealPeriods.forEach((mp: any) => periods.add(mp.period));
      }

      if (Array.isArray(mealStations)) {
        mealStations.forEach((ms: any) => stations.add(ms.station));
      }

      const productType = getProductType(p);
      typeCounts[productType]++;
    });

    const { data: categoriesData } = await supabase
      .from('product_categories')
      .select('id, name, display_name')
      .order('name');

    const sections: FilterSection[] = [];

    sections.push({
      id: 'productTypes',
      label: 'Product Type',
      options: [
        { value: 'custom', label: `Custom (${typeCounts.custom})` },
        { value: 'imported', label: `Imported (${typeCounts.imported})` },
        { value: 'linked', label: `Linked (${typeCounts.linked})` }
      ]
    });

    if (categoriesData && categoriesData.length > 0) {
      sections.push({
        id: 'categories',
        label: 'Categories',
        options: categoriesData.map(c => ({
          value: c.id,
          label: c.display_name || c.name
        }))
      });
    }

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
      productTypes: ['custom', 'imported', 'linked'],
      categories: [],
      periods: [],
      stations: []
    });
  };



  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.attributes?.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const selectedTypes = filterState.productTypes || [];
    const selectedPeriods = filterState.periods || [];
    const selectedStations = filterState.stations || [];
    const selectedCategories = filterState.categories || [];

    const productType = getProductType(product);
    const mealPeriods = product.attributes?.meal_periods;
    const mealStations = product.attributes?.meal_stations;
    const productCategories = productCategoryMap.get(product.id) || [];

    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(productType);

    const matchesCategory = selectedCategories.length === 0 ||
      selectedCategories.some(catId => productCategories.includes(catId));

    const matchesPeriod = selectedPeriods.length === 0 ||
      (Array.isArray(mealPeriods) && mealPeriods.some((mp: any) => selectedPeriods.includes(mp.period)));

    const matchesStation = selectedStations.length === 0 ||
      (Array.isArray(mealStations) && mealStations.some((ms: any) => selectedStations.includes(ms.station)));

    return matchesSearch && matchesType && matchesCategory && matchesPeriod && matchesStation;
  });

  const getBreadcrumbItems = () => {
    const items = [
      { label: 'WAND Digital', onClick: () => setLocation({}) }
    ];

    if (location.concept) {
      items.push({
        label: location.concept.name,
        onClick: () => setLocation({ concept: location.concept })
      });
    }

    if (location.company) {
      items.push({
        label: location.company.name,
        onClick: () => setLocation({ concept: location.concept, company: location.company })
      });
    }

    if (location.store) {
      items.push({ label: location.store.name });
    } else if (!location.concept && !location.company) {
      items.push({ label: 'All Locations' });
    }

    return items;
  };

  const getLocationLevelDisplay = () => {
    if (location.store) return 'Store Level';
    if (location.company) return 'Company Level';
    if (location.concept) return 'Concept Level';
    return 'WAND Level (Global Default)';
  };

  if (viewLevel === 'product-create') {
    return (
      <ProductEdit
        mode="create"
        onBack={() => {
          setViewLevel('list');
          setSelectedProduct(null);
        }}
        onSave={() => {
          loadProducts();
          setViewLevel('list');
          setSelectedProduct(null);
        }}
      />
    );
  }

  if (viewLevel === 'product-edit' && selectedProduct) {
    return (
      <ProductEdit
        productId={selectedProduct.id}
        mode="edit"
        onBack={() => {
          setViewLevel('list');
          setSelectedProduct(null);
        }}
        onSave={() => {
          loadProducts();
          setViewLevel('list');
          setSelectedProduct(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto h-[calc(100vh-200px)]">
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
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowMapper(true);
                  setSidePanelOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-900 rounded-lg font-medium transition-colors"
              >
                <Link2 className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Map Integration Products</div>
                  <div className="text-xs text-blue-700">Link integration data to products</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowTemplateManager(true);
                  setSidePanelOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-900 rounded-lg font-medium transition-colors"
              >
                <Settings className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Manage Templates</div>
                  <div className="text-xs text-blue-700">Set default attribute template</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCategoryManager(true);
                  setSidePanelOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-900 rounded-lg font-medium transition-colors"
              >
                <FolderTree className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Manage Categories</div>
                  <div className="text-xs text-blue-700">Create and organize product categories</div>
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#00adf0] to-[#0099d6] rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Product Management</h1>
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedProduct(null);
                setViewLevel('product-create');
              }}
              className="px-4 py-2 bg-[#00adf0] text-white rounded-lg hover:bg-[#0099d6] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Product
            </button>
            <button
              onClick={() => setSidePanelOpen(true)}
              className="px-4 py-2 border-2 border-[#00adf0] bg-white hover:bg-slate-50 text-[#00adf0] rounded-lg transition-colors flex items-center gap-2"
            >
              <Menu className="w-4 h-4" />
              Actions
            </button>
          </div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Current Context:</strong> {getLocationLevelDisplay()} - Products visible at this level and can be customized down the hierarchy.
          </p>
        </div>
      </div>

      <div className="flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-[calc(100%-120px)]">
        <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <div className="w-px h-4 bg-slate-300" />
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-blue-50 border border-blue-200 rounded-sm" />
                      <span>Custom/API Product</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-50 border border-amber-300 rounded-sm" />
                      <span>Policy Issue</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

        <div className={`flex-1 overflow-y-auto ${viewMode === 'tile' ? 'p-6' : ''}`}>
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
                  setViewLevel('product-edit');
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
                    setViewLevel('product-edit');
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
