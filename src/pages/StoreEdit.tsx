import { useState, useEffect, FormEvent, useRef } from 'react';
import { ArrowLeft, Save, AlertCircle, MapPin, Phone, Clock, Globe, Building2, Layers, X, Info, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StoreDaypartDefinitions from '../components/StoreDaypartDefinitions';
import PlacementGroupModal from '../components/PlacementGroupModal';

interface StoreData {
  id?: number;
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

interface StoreEditProps {
  storeId?: number;
  companyId: number;
  onBack: () => void;
  onSave: (store: StoreData) => void;
}

export default function StoreEdit({ storeId, companyId, onBack, onSave }: StoreEditProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<StoreData>({
    company_id: companyId,
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    latitude: undefined,
    longitude: undefined
  });

  const [placements, setPlacements] = useState<PlacementGroup[]>([]);
  const [storeRoot, setStoreRoot] = useState<PlacementGroup | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<PlacementGroup | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState('basic-info');
  const [idCopied, setIdCopied] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const originalDataRef = useRef<StoreData | null>(null);

  useEffect(() => {
    loadData();
  }, [storeId]);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -66% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const intersectingEntries = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (intersectingEntries.length > 0) {
        setActiveSection(intersectingEntries[0].target.id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const refs = Object.values(sectionRefs.current).filter(ref => ref !== null);
    refs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      refs.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [storeId, storeRoot]);

  const checkIfDirty = () => {
    if (!originalDataRef.current) {
      return storeId ? false : true;
    }

    return JSON.stringify(formData) !== JSON.stringify(originalDataRef.current);
  };

  useEffect(() => {
    setIsDirty(checkIfDirty());
  }, [formData]);

  const loadData = async () => {
    setLoading(true);

    if (storeId) {
      const { data, error: fetchError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading store:', fetchError);
        setError('Failed to load store');
      } else if (data) {
        setFormData(data);
        originalDataRef.current = data;
      }

      await loadPlacements();
    } else {
      setLoading(false);
    }
  };

  const loadPlacements = async () => {
    if (!storeId) return;

    const { data: rootData, error: rootError } = await supabase
      .from('placement_groups')
      .select('*')
      .eq('store_id', storeId)
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
      .eq('store_id', storeId)
      .eq('is_store_root', false)
      .order('name');

    if (placementsError) {
      console.error('Error loading placements:', placementsError);
    } else {
      setPlacements(placementsData || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Store name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (storeId) {
        const { error: updateError } = await supabase
          .from('stores')
          .update(formData)
          .eq('id', storeId);

        if (updateError) throw updateError;
      } else {
        const { data: newStore, error: insertError } = await supabase
          .from('stores')
          .insert([formData])
          .select()
          .single();

        if (insertError) throw insertError;
        formData.id = newStore.id;
      }

      originalDataRef.current = { ...formData };
      setIsDirty(false);
      onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save store');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleDiscardAndExit = () => {
    setShowExitConfirm(false);
    onBack();
  };

  const handleSaveAndExit = async () => {
    setShowExitConfirm(false);
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showExitConfirm) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, showExitConfirm]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleAddPlacement = (parentId: string | null = null) => {
    setParentForNew(parentId);
    setEditingPlacement(null);
    setShowPlacementModal(true);
  };

  const handleEditPlacement = (placement: PlacementGroup) => {
    setEditingPlacement(placement);
    setParentForNew(null);
    setShowPlacementModal(true);
  };

  const handleDeletePlacement = async (placementId: string) => {
    if (!confirm('Are you sure you want to delete this placement?')) return;

    const { error } = await supabase
      .from('placement_groups')
      .delete()
      .eq('id', placementId);

    if (error) {
      console.error('Error deleting placement:', error);
      alert('Failed to delete placement');
    } else {
      await loadPlacements();
    }
  };

  const handlePlacementSave = async () => {
    setShowPlacementModal(false);
    await loadPlacements();
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const copyIdToClipboard = async () => {
    if (storeId) {
      try {
        await navigator.clipboard.writeText(storeId.toString());
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const getSections = () => {
    const sections = [
      { id: 'basic-info', label: 'Basic Information', icon: Info },
      { id: 'store-location', label: 'Store Location', icon: MapPin },
    ];

    if (storeId) {
      sections.push({ id: 'daypart-definitions', label: 'Daypart Definitions', icon: Clock });
    }

    if (storeId && storeRoot) {
      sections.push({ id: 'placements', label: 'Placements', icon: Layers });
    }

    return sections;
  };

  if (loading && storeId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Unsaved Changes
                  </h3>
                  <p className="text-slate-600 text-sm">
                    You have unsaved changes. What would you like to do?
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscardAndExit}
                className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSaveAndExit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Site Configuration
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {storeId ? 'Edit Store Configuration' : 'Create Store'}
                </h1>
                <p className="text-slate-600">
                  {storeId
                    ? 'Update store details, dayparts, and placements'
                    : 'Create a new store location'}
                </p>
              </div>
              {storeId && (
                <button
                  onClick={copyIdToClipboard}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-mono border border-slate-300"
                  title="Click to copy ID"
                >
                  {idCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>ID: {storeId}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-8">
            <aside className="w-64 flex-shrink-0">
              <div className="sticky top-8 bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">
                  Sections
                </h3>
                <nav className="space-y-1">
                  {getSections().map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeSection === section.id
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 -ml-px pl-2.5'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-left">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <form onSubmit={handleSubmit} className="flex-1 space-y-8">
              <div
                id="basic-info"
                ref={(el) => (sectionRefs.current['basic-info'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Downtown Location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div
                id="store-location"
                ref={(el) => (sectionRefs.current['store-location'] = el)}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
              >
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Store Location</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.zip_code || ''}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ZIP"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 40.7128"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., -74.0060"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {storeId && (
                <div
                  id="daypart-definitions"
                  ref={(el) => (sectionRefs.current['daypart-definitions'] = el)}
                  className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
                >
                  <StoreDaypartDefinitions storeId={storeId} />
                </div>
              )}

              {storeId && storeRoot && (
                <div
                  id="placements"
                  ref={(el) => (sectionRefs.current['placements'] = el)}
                  className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm scroll-mt-20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Placements</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddPlacement(storeRoot.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      Add Placement
                    </button>
                  </div>

                  {placements.length > 0 ? (
                    <div className="grid gap-3">
                      {placements.map((placement) => (
                        <div
                          key={placement.id}
                          className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900">{placement.name}</h4>
                              {placement.description && (
                                <p className="text-sm text-slate-600 mt-1">{placement.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                                {placement.address && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {placement.address}
                                  </span>
                                )}
                                {placement.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {placement.phone}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {placement.timezone}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                type="button"
                                onClick={() => handleEditPlacement(placement)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Building2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePlacement(placement.id)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No placements yet. Add your first placement to get started.</p>
                    </div>
                  )}
                </div>
              )}

              {isDirty && (
                <div className="sticky bottom-0 bg-white rounded-lg border border-slate-200 p-6 shadow-lg transition-all duration-300 ease-in-out">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {storeId ? 'Update Store' : 'Create Store'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {showPlacementModal && storeRoot && (
        <PlacementGroupModal
          storeId={storeId!}
          storeRoot={storeRoot}
          group={editingPlacement || undefined}
          parentId={parentForNew}
          onClose={() => setShowPlacementModal(false)}
          onSave={handlePlacementSave}
        />
      )}
    </>
  );
}
