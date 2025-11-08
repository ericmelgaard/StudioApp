import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Store, Edit2, Trash2, MapPin, Building2, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlacementGroupModal from '../components/PlacementGroupModal';
import MetricsBar from '../components/MetricsBar';
import StoresGrid from '../components/StoresGrid';
import StoreMap from '../components/StoreMap';
import StoreModal from '../components/StoreModal';
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

interface StoreData {
  id: number;
  company_id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface CompanyData {
  id: number;
  name: string;
  concept_id: number;
}

interface StoreManagementProps {
  onBack: () => void;
}

export default function StoreManagement({ onBack }: StoreManagementProps) {
  const { location, setLocation } = useLocation();

  const [viewLevel, setViewLevel] = useState<'company' | 'store'>('company');
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [placements, setPlacements] = useState<PlacementGroup[]>([]);
  const [storeRoot, setStoreRoot] = useState<PlacementGroup | null>(null);

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [parentForNewPlacement, setParentForNewPlacement] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    determineViewLevel();
  }, [location]);

  const determineViewLevel = async () => {
    setLoading(true);

    if (location.store) {
      setViewLevel('store');
      await loadStoreLevelData();
    } else if (location.company) {
      setViewLevel('company');
      await loadCompanyLevelData();
    } else {
      await loadInitialCompany();
    }

    setLoading(false);
  };

  const loadInitialCompany = async () => {
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .order('name')
      .limit(1);

    if (companiesData && companiesData.length > 0) {
      setLocation({ company: companiesData[0] });
    }
  };

  const loadCompanyLevelData = async () => {
    if (!location.company) return;

    setCompany(location.company);

    const { data: storesData, error } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', location.company.id)
      .order('name');

    if (error) {
      console.error('Error loading stores:', error);
    } else {
      setStores(storesData || []);
    }
  };

  const loadStoreLevelData = async () => {
    if (!location.store) return;

    if (location.company) {
      setCompany(location.company);
    }

    const { data: rootData, error: rootError } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('store_id', location.store.id)
      .eq('is_store_root', true)
      .maybeSingle();

    if (rootError) {
      console.error('Error loading store root:', rootError);
    } else {
      setStoreRoot(rootData);
    }

    const { data: placementsData, error: placementsError } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('store_id', location.store.id)
      .eq('is_store_root', false)
      .order('name');

    if (placementsError) {
      console.error('Error loading placements:', placementsError);
    } else {
      setPlacements(placementsData || []);
    }
  };

  const handleBackToCompany = () => {
    if (location.company) {
      setLocation({ company: location.company });
    }
  };

  const handleSelectStore = (store: StoreData) => {
    setLocation({
      company: location.company,
      store
    });
  };

  const handleEditStore = () => {
    if (storeRoot) {
      setEditingItem(storeRoot);
      setShowPlacementModal(true);
    }
  };

  const handleAddPlacement = (parentId: string | null = null) => {
    setEditingItem(null);
    setParentForNewPlacement(parentId);
    setShowPlacementModal(true);
  };

  const handleEditPlacement = (placement: PlacementGroup) => {
    setEditingItem(placement);
    setShowPlacementModal(true);
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
      loadStoreLevelData();
    }
  };

  const availableParents = placements.filter((p) => p.id !== editingItem?.id);
  if (storeRoot && editingItem?.id !== storeRoot.id) {
    availableParents.unshift(storeRoot);
  }

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
      {company && (
        <>
          <span className="font-medium text-slate-900">{company.name}</span>
          {location.store && (
            <>
              <span>›</span>
              <span className="font-medium text-slate-900">{location.store.name}</span>
            </>
          )}
        </>
      )}
    </div>
  );

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

  if (viewLevel === 'company') {
    const totalStores = stores.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">Store Configuration</h1>
            <p className="text-slate-600">Manage store locations and settings</p>
            {renderBreadcrumbs()}
          </div>

          <MetricsBar
            metrics={[
              { label: 'Total Stores', value: totalStores, icon: Store, color: 'bg-purple-500' }
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Stores</h2>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowStoreModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Add Store
                </button>
              </div>

              <StoresGrid
                stores={stores}
                onEdit={(store) => {
                  setEditingItem(store);
                  setShowStoreModal(true);
                }}
                onSelect={handleSelectStore}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Store Locations</h2>
              <StoreMap stores={stores.filter(s => s.latitude && s.longitude)} />
            </div>
          </div>
        </div>

        {showStoreModal && (
          <StoreModal
            store={editingItem}
            companyId={company?.id}
            onClose={() => {
              setShowStoreModal(false);
              setEditingItem(null);
            }}
            onSave={() => {
              setShowStoreModal(false);
              setEditingItem(null);
              loadCompanyLevelData();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <button
            onClick={handleBackToCompany}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={18} />
            Back to {company?.name || 'Stores'}
          </button>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">Store Configuration</h1>
          <p className="text-slate-600">Manage store settings and placement groups</p>
          {renderBreadcrumbs()}
        </div>

        <div className="space-y-6">
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
                      {storeRoot.phone && (
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Phone</div>
                            <div className="text-sm text-slate-900">{storeRoot.phone}</div>
                          </div>
                        </div>
                      )}
                      {storeRoot.timezone && (
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
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
                </div>
              )}
            </div>
          </div>

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
                      const children = placements
                        .filter(p => {
                          if (parentId === storeRoot?.id) {
                            return p.parent_id === parentId || p.parent_id === null;
                          }
                          return p.parent_id === parentId;
                        })
                        .sort((a, b) => a.name.localeCompare(b.name));

                      const result: PlacementGroup[] = [];
                      for (const child of children) {
                        result.push(child);
                        const descendants = buildHierarchy(child.id);
                        result.push(...descendants);
                      }
                      return result;
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
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAddPlacement(placement.id)}
                                className="px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                              >
                                <Plus className="w-4 h-4" />
                                Add
                              </button>
                              <button
                                onClick={() => handleEditPlacement(placement)}
                                className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePlacement(placement)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
      </div>

      {showPlacementModal && (
        <PlacementGroupModal
          group={editingItem}
          availableParents={availableParents}
          storeId={location.store?.id}
          defaultParentId={parentForNewPlacement}
          isParentStoreRoot={parentForNewPlacement === storeRoot?.id}
          onClose={() => {
            setShowPlacementModal(false);
            setEditingItem(null);
            setParentForNewPlacement(null);
          }}
          onSuccess={() => {
            setShowPlacementModal(false);
            setEditingItem(null);
            setParentForNewPlacement(null);
            loadStoreLevelData();
          }}
        />
      )}
    </div>
  );
}
