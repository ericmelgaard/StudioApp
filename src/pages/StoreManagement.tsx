import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Store, Edit2, Trash2, MapPin, Building2, Clock, Phone, Globe } from 'lucide-react';
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

interface StoreManagementProps {
  onBack: () => void;
}

// American Airlines Lounges company ID
const AA_LOUNGES_COMPANY_ID = 2156;

export default function StoreManagement({ onBack }: StoreManagementProps) {
  const [placements, setPlacements] = useState<PlacementGroup[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [storeRoot, setStoreRoot] = useState<PlacementGroup | null>(null);
  const [storeContext, setStoreContext] = useState<{
    store?: StoreType;
    company?: Company;
    concept?: Concept;
  }>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PlacementGroup | null>(null);
  const [editingStore, setEditingStore] = useState(false);

  useEffect(() => {
    loadLocationContext();
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadStoreData();
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

  const loadStores = async () => {
    setLoading(true);

    // Filter stores by American Airlines Lounges company
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', AA_LOUNGES_COMPANY_ID)
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

    setLoading(false);
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

  const handleAddPlacement = () => {
    setSelectedGroup(null);
    setEditingStore(false);
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
    loadStoreData();
  };

  const availableParents = placements.filter(
    (p) => p.id !== selectedGroup?.id
  );
  // Add store root as a potential parent
  if (storeRoot && !editingStore) {
    availableParents.unshift(storeRoot);
  }

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
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Selector */}
        {stores.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Store
            </label>
            <select
              value={selectedStore?.id || ''}
              onChange={(e) => {
                const store = stores.find(s => s.id === parseInt(e.target.value));
                setSelectedStore(store || null);
              }}
              className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : !selectedStore ? (
          <div className="text-center py-12">
            <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No store selected</h3>
            <p className="text-slate-600">
              Select a store to manage its configuration
            </p>
          </div>
        ) : (
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
                    onClick={handleAddPlacement}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Placement
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
                      onClick={handleAddPlacement}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Placement
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {placements.map((placement) => (
                      <div
                        key={placement.id}
                        className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-1 h-10 bg-amber-400 rounded-full" />
                        <Store className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{placement.name}</h3>
                          {placement.description && (
                            <p className="text-sm text-slate-600">{placement.description}</p>
                          )}
                          {placement.parent_id && (
                            <div className="text-xs text-slate-500 mt-1">
                              Parent: {placements.find(p => p.id === placement.parent_id)?.name || storeRoot?.name || 'Store Root'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditPlacement(placement)}
                            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit placement"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlacement(placement)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete placement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <PlacementGroupModal
          group={selectedGroup}
          availableParents={availableParents}
          onClose={() => {
            setShowModal(false);
            setSelectedGroup(null);
            setEditingStore(false);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
