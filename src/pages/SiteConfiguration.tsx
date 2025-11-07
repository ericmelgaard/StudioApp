import { useState, useEffect } from 'react';
import { Store, Edit2, Trash2, MapPin, Phone, Globe, Plus, Building2, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlacementGroupModal from '../components/PlacementGroupModal';
import LocationRequired from '../components/LocationRequired';
import { useLocation } from '../hooks/useLocation';

interface PlacementGroup {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  store_id: number | null;
  is_store_root: boolean;
  daypart_hours: Record<string, any>;
  meal_stations: string[];
  templates: Record<string, any>;
  nfc_url: string | null;
  address: string | null;
  timezone: string;
  phone: string | null;
  operating_hours: Record<string, any>;
  created_at: string;
}

interface StoreType {
  id: number;
  name: string;
  company_id: number;
}

interface Company {
  id: number;
  name: string;
  concept_id: number;
}

interface Concept {
  id: number;
  name: string;
}

export default function SiteConfiguration() {
  const { location } = useLocation();
  const [placements, setPlacements] = useState<PlacementGroup[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [storeRoot, setStoreRoot] = useState<PlacementGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PlacementGroup | null>(null);
  const [editingStore, setEditingStore] = useState(false);
  const [parentForNewPlacement, setParentForNewPlacement] = useState<string | null>(null);

  // Determine if we're at WAND Digital level (no location selected)
  const isWandLevel = !location.concept && !location.company && !location.store;

  // Determine if we have enough context to show configuration
  const hasStoreContext = location.store || selectedStore;

  useEffect(() => {
    loadData();
  }, [location]);

  useEffect(() => {
    if (selectedStore) {
      loadStoreData();
    }
  }, [selectedStore]);

  const loadData = async () => {
    setLoading(true);

    // If at WAND level, don't load anything
    if (isWandLevel) {
      setLoading(false);
      return;
    }

    // If at site level, auto-select that store
    if (location.store) {
      setSelectedStore(location.store);
      setLoading(false);
      return;
    }

    // If at company level, load stores for that company
    if (location.company) {
      const { data: storesData, error } = await supabase
        .from('stores')
        .select('*')
        .eq('company_id', location.company.id)
        .order('name');

      if (error) {
        console.error('Error loading stores:', error);
      } else {
        setStores(storesData || []);
        // Auto-select if only one store
        if (storesData && storesData.length === 1) {
          setSelectedStore(storesData[0]);
        }
      }
      setLoading(false);
      return;
    }

    // If at concept level, load companies first
    if (location.concept) {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('concept_id', location.concept.id)
        .order('name');

      if (companiesError) {
        console.error('Error loading companies:', companiesError);
      } else {
        setCompanies(companiesData || []);
      }
      setLoading(false);
    }
  };

  const loadStoresForCompany = async (companyId: number) => {
    const { data: storesData, error } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      console.error('Error loading stores:', error);
    } else {
      setStores(storesData || []);
      // Auto-select if only one store
      if (storesData && storesData.length === 1) {
        setSelectedStore(storesData[0]);
      } else {
        setSelectedStore(null);
      }
    }
  };

  const loadStoreData = async () => {
    if (!selectedStore) return;

    // Load store root placement
    const { data: rootData, error: rootError } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('store_id', selectedStore.id)
      .eq('is_store_root', true)
      .maybeSingle();

    if (rootError) {
      console.error('Error loading store root:', rootError);
    } else {
      setStoreRoot(rootData);
    }

    // Load child placements
    const { data: placementsData, error: placementsError } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('store_id', selectedStore.id)
      .eq('is_store_root', false)
      .order('name');

    if (placementsError) {
      console.error('Error loading placements:', placementsError);
    } else {
      setPlacements(placementsData || []);
    }
  };

  const handleCompanyChange = (companyId: number) => {
    const company = companies.find(c => c.id === companyId);
    setSelectedCompany(company || null);
    setSelectedStore(null);
    setStores([]);
    if (company) {
      loadStoresForCompany(company.id);
    }
  };

  const handleStoreChange = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    setSelectedStore(store || null);
  };

  const handleAddPlacement = (parentId: string | null = null) => {
    setSelectedGroup(null);
    setEditingStore(false);
    setParentForNewPlacement(parentId);
    setShowModal(true);
  };

  const handleAddChildToPlacement = (parentPlacement: PlacementGroup) => {
    setSelectedGroup(null);
    setEditingStore(false);
    setParentForNewPlacement(parentPlacement.id);
    setShowModal(true);
  };

  const handleEditStore = () => {
    if (storeRoot) {
      setSelectedGroup(storeRoot);
      setEditingStore(true);
      setShowModal(true);
    }
  };

  const handleEditPlacement = (placement: PlacementGroup) => {
    setSelectedGroup(placement);
    setEditingStore(false);
    setShowModal(true);
  };

  const handleDeletePlacement = async (placement: PlacementGroup) => {
    if (placement.is_store_root) {
      alert('Cannot delete store root placement');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${placement.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('placement_groups')
      .delete()
      .eq('id', placement.id);

    if (error) {
      console.error('Error deleting placement:', error);
      alert(`Failed to delete placement: ${error.message}`);
    } else {
      loadStoreData();
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setSelectedGroup(null);
    setEditingStore(false);
    setParentForNewPlacement(null);
    loadStoreData();
  };

  const availableParents = placements.filter(
    (p) => p.id !== selectedGroup?.id
  );
  if (storeRoot && !editingStore) {
    availableParents.unshift(storeRoot);
  }

  // Show location required message at WAND level
  if (isWandLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Site Configuration</h1>
            <p className="text-slate-600">Manage store locations and placement configurations</p>
          </div>

          <LocationRequired action="managing site configuration" className="mb-6" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Site Configuration</h1>
          <p className="text-slate-600">Manage store locations and placement configurations</p>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
            {location.concept && (
              <>
                <Building2 className="w-4 h-4" />
                <span>{location.concept.name}</span>
              </>
            )}
            {location.company && (
              <>
                <span>›</span>
                <span>{location.company.name}</span>
              </>
            )}
            {(location.store || selectedStore) && (
              <>
                <span>›</span>
                <span className="font-medium text-slate-700">
                  {location.store?.name || selectedStore?.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Context-based selectors */}
        {location.concept && !location.company && !location.store && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Company and Site</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company
                </label>
                <select
                  value={selectedCompany?.id || ''}
                  onChange={(e) => handleCompanyChange(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a company...</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Site
                </label>
                <select
                  value={selectedStore?.id || ''}
                  onChange={(e) => handleStoreChange(parseInt(e.target.value))}
                  disabled={!selectedCompany || stores.length === 0}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a site...</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {location.company && !location.store && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Site</h2>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Site
              </label>
              <select
                value={selectedStore?.id || ''}
                onChange={(e) => handleStoreChange(parseInt(e.target.value))}
                disabled={stores.length === 0}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a site...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Show configuration only when we have a store selected */}
        {hasStoreContext ? (
          <div className="space-y-6">
            {/* Store Configuration Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Store Configuration</h2>
                    <p className="text-sm text-slate-600">
                      Manage location details, hours, and store-level settings
                    </p>
                  </div>
                  <button
                    onClick={handleEditStore}
                    disabled={!storeRoot}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Store
                  </button>
                </div>
              </div>

              <div className="p-6">
                {storeRoot ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Location Information</h3>
                      <div className="space-y-3">
                        {storeRoot.address ? (
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Address</div>
                              <div className="text-sm text-slate-900">{storeRoot.address}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 italic">No address configured</div>
                        )}
                        {storeRoot.phone ? (
                          <div className="flex items-start gap-3">
                            <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Phone</div>
                              <div className="text-sm text-slate-900">{storeRoot.phone}</div>
                            </div>
                          </div>
                        ) : null}
                        {storeRoot.timezone && (
                          <div className="flex items-start gap-3">
                            <Globe className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Timezone</div>
                              <div className="text-sm text-slate-900">{storeRoot.timezone}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Operating Hours</h3>
                      {storeRoot.operating_hours && Object.keys(storeRoot.operating_hours).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(storeRoot.operating_hours).map(([day, hours]: [string, any]) => (
                            <div key={day} className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 font-medium w-24">{day}</span>
                              {hours.open && hours.close ? (
                                <span className="text-slate-900">
                                  {hours.open} - {hours.close}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Closed</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 italic">No operating hours configured</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">Store configuration not initialized</p>
                    <button
                      onClick={handleEditStore}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Initialize Store Configuration
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Placements Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Placements</h2>
                    <p className="text-sm text-slate-600">
                      Organize areas within the store with hierarchical placements
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddPlacement(storeRoot?.id || null)}
                    disabled={!storeRoot}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add Placement Group
                  </button>
                </div>
              </div>

              <div className="p-6">
                {placements.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Store className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">No placements yet</h3>
                    <p className="text-slate-600 mb-4 text-sm">
                      Create placements to organize different areas within the store
                    </p>
                    <button
                      onClick={() => handleAddPlacement(storeRoot?.id || null)}
                      disabled={!storeRoot}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add Placement Group
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const calculateDepth = (placementId: string, visited = new Set<string>()): number => {
                        if (visited.has(placementId)) return 0;
                        visited.add(placementId);

                        const placement = placements.find(p => p.id === placementId);
                        if (!placement || !placement.parent_id || placement.parent_id === storeRoot?.id) {
                          return 0;
                        }
                        return 1 + calculateDepth(placement.parent_id, visited);
                      };

                      const buildHierarchy = (parentId: string | null | undefined): PlacementGroup[] => {
                        return placements
                          .filter(p => {
                            // Match exact parent_id, or if we're looking for top-level (store root or null)
                            if (parentId === storeRoot?.id || parentId === null || parentId === undefined) {
                              return p.parent_id === storeRoot?.id || p.parent_id === null;
                            }
                            return p.parent_id === parentId;
                          })
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .flatMap(placement => [placement, ...buildHierarchy(placement.id)]);
                      };

                      return buildHierarchy(storeRoot?.id).map((placement) => {
                        const parentName = placement.parent_id
                          ? (placements.find(p => p.id === placement.parent_id)?.name || storeRoot?.name || 'Unknown')
                          : storeRoot?.name || 'Store Root';

                        const depth = calculateDepth(placement.id);
                        const childCount = placements.filter(p => p.parent_id === placement.id).length;

                        return (
                          <div key={placement.id} style={{ marginLeft: `${depth * 2.5}rem` }}>
                          <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group">
                            <div className="w-1 h-10 bg-amber-400 rounded-full" />
                            <Layers className="w-5 h-5 text-amber-600 flex-shrink-0" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900">{placement.name}</h3>
                              {placement.description && (
                                <p className="text-sm text-slate-600">{placement.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span>Parent: {parentName}</span>
                                {childCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{childCount} child placement{childCount !== 1 ? 's' : ''}</span>
                                  </>
                                )}
                                {placement.meal_stations && placement.meal_stations.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{placement.meal_stations.length} meal station{placement.meal_stations.length !== 1 ? 's' : ''}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAddChildToPlacement(placement)}
                                className="px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                title="Add child placement"
                              >
                                <Plus className="w-4 h-4" />
                                Add
                              </button>
                              <button
                                onClick={() => handleEditPlacement(placement)}
                                className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Edit placement"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePlacement(placement)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete placement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          !location.store && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Site Selection Required</h3>
                  <p className="text-sm text-amber-800">
                    Please select a site from the {location.concept && !location.company ? 'company and site selectors' : 'site selector'} above to view and manage its configuration.
                  </p>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {showModal && (
        <PlacementGroupModal
          group={selectedGroup}
          availableParents={availableParents}
          storeId={selectedStore?.id || location.store?.id}
          defaultParentId={parentForNewPlacement}
          isParentStoreRoot={parentForNewPlacement === storeRoot?.id}
          onClose={() => {
            setShowModal(false);
            setSelectedGroup(null);
            setEditingStore(false);
            setParentForNewPlacement(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
