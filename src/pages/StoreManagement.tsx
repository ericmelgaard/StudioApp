import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Store, Edit2, Trash2, MapPin, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlacementGroupModal from '../components/PlacementGroupModal';

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

interface Store {
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

interface StoreManagementProps {
  onBack: () => void;
}

export default function StoreManagement({ onBack }: StoreManagementProps) {
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
  const [storeRoots, setStoreRoots] = useState<PlacementGroup[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storeContext, setStoreContext] = useState<{
    store?: Store;
    company?: Company;
    concept?: Concept;
  }>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PlacementGroup | null>(null);

  useEffect(() => {
    loadLocationContext();
    loadStoresAndPlacements();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadPlacementGroups();
    }
  }, [selectedStore]);

  const loadLocationContext = () => {
    try {
      const saved = localStorage.getItem('selectedLocation');
      if (saved) {
        const location = JSON.parse(saved);
        setStoreContext(location);
        if (location.store) {
          setSelectedStore(location.store);
        }
      }
    } catch (err) {
      console.error('Error loading location context:', err);
    }
  };

  const loadStoresAndPlacements = async () => {
    setLoading(true);
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .order('name');

    if (storesError) {
      console.error('Error loading stores:', storesError);
    } else {
      setStores(storesData || []);
      // If no store selected yet, select first store
      if (!selectedStore && storesData && storesData.length > 0) {
        setSelectedStore(storesData[0]);
      }
    }

    const { data: rootsData, error: rootsError } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('is_store_root', true)
      .order('name');

    if (rootsError) {
      console.error('Error loading store roots:', rootsError);
    } else {
      setStoreRoots(rootsData || []);
    }

    setLoading(false);
  };

  const loadPlacementGroups = async () => {
    if (!selectedStore) return;

    const { data, error } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('store_id', selectedStore.id)
      .order('name');

    if (error) {
      console.error('Error loading placement groups:', error);
      alert(`Failed to load placement groups: ${error.message}`);
    } else {
      setPlacementGroups(data || []);
    }
  };

  const handleAddGroup = () => {
    setSelectedGroup(null);
    setShowModal(true);
  };

  const handleEditGroup = (group: PlacementGroup) => {
    setSelectedGroup(group);
    setShowModal(true);
  };

  const handleDeleteGroup = async (group: PlacementGroup) => {
    if (group.is_store_root) {
      alert('Cannot delete store root placement');
      return;
    }

    if (group.name === '36355 - WAND Digital Demo') {
      alert('Cannot delete the default store placement group');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${group.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('placement_groups')
      .delete()
      .eq('id', group.id);

    if (error) {
      console.error('Error deleting placement group:', error);
      alert(`Failed to delete placement group: ${error.message}`);
    } else {
      loadPlacementGroups();
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setSelectedGroup(null);
    loadPlacementGroups();
  };

  const availableParents = placementGroups.filter(
    (g) => g.id !== selectedGroup?.id
  );

  const storeRoot = placementGroups.find(g => g.is_store_root);
  const childPlacements = placementGroups.filter(g => !g.is_store_root);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Store Management</h1>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {storeContext.concept && (
                    <>
                      <Building2 className="w-3 h-3" />
                      <span>{storeContext.concept.name}</span>
                      {storeContext.company && (
                        <>
                          <span>›</span>
                          <span>{storeContext.company.name}</span>
                        </>
                      )}
                      {selectedStore && (
                        <>
                          <span>›</span>
                          <span className="font-medium text-slate-700">{selectedStore.name}</span>
                        </>
                      )}
                    </>
                  )}
                  {!storeContext.concept && selectedStore && (
                    <>
                      <MapPin className="w-3 h-3" />
                      <span className="font-medium text-slate-700">{selectedStore.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleAddGroup}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Placement Group
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-900">Store Placements</h2>
              {stores.length > 1 && (
                <select
                  value={selectedStore?.id || ''}
                  onChange={(e) => {
                    const store = stores.find(s => s.id === parseInt(e.target.value));
                    setSelectedStore(store || null);
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-slate-600">
              Each store has a root placement with location details. Add child placements to organize areas within the store. All placements share the same configuration options: dayparts, meal stations, templates, and NFC URLs.
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin" />
              </div>
            ) : !selectedStore ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No store selected</h3>
                <p className="text-slate-600">
                  Select a store to manage its placements
                </p>
              </div>
            ) : placementGroups.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No placements found</h3>
                <p className="text-slate-600 mb-4">
                  This store doesn't have a root placement yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Store Root Placement */}
                {storeRoot && (
                  <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <Store className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900">{storeRoot.name}</h3>
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                            Store Root
                          </span>
                        </div>
                        {storeRoot.description && (
                          <p className="text-sm text-slate-700 mb-2">{storeRoot.description}</p>
                        )}
                        {storeRoot.address && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                            <MapPin className="w-4 h-4" />
                            <span>{storeRoot.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                          {storeRoot.phone && <span>📞 {storeRoot.phone}</span>}
                          {storeRoot.timezone && <span>🌍 {storeRoot.timezone}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditGroup(storeRoot)}
                        className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                        title="Edit store root placement"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Child Placements */}
                {childPlacements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 px-2">Child Placements</h3>
                    <div className="space-y-2">
                      {childPlacements.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
                        >
                          <div className="w-1 h-8 bg-amber-300 rounded-full" />
                          <Store className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{group.name}</h3>
                            {group.description && (
                              <p className="text-sm text-slate-600">{group.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit placement"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group)}
                              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete placement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <PlacementGroupModal
          group={selectedGroup}
          availableParents={availableParents}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
