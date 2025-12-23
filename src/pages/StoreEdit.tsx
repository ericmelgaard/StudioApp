import { useState, useEffect } from 'react';
import { ArrowLeft, Save, MapPin, Phone, Clock, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (storeId) {
      loadStore();
      loadPlacements();
    } else {
      setLoading(false);
    }
  }, [storeId]);

  const loadStore = async () => {
    if (!storeId) return;

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (error) {
      console.error('Error loading store:', error);
      setError('Failed to load store');
    } else if (data) {
      setFormData(data);
    }
  };

  const loadPlacements = async () => {
    if (!storeId) return;

    setLoading(true);

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

  const handleSave = async () => {
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

      onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save store');
    } finally {
      setSaving(false);
    }
  };

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

  if (loading && storeId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {storeId ? 'Edit Store' : 'Add Store'}
        </h1>
        <p className="text-slate-600">
          {storeId ? 'Update store information and manage placements' : 'Create a new store location'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Store Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Store Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Store name"
            />
          </div>

          <div className="col-span-2">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Phone number"
            />
          </div>

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
              placeholder="Latitude"
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
              placeholder="Longitude"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Store'}
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {storeId && storeRoot && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Placements</h2>
            <button
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
                      <h3 className="font-medium text-slate-900">{placement.name}</h3>
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
                        onClick={() => handleEditPlacement(placement)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Building2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlacement(placement.id)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Building2 className="w-4 h-4" />
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
    </div>
  );
}
