import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Store, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlacementGroupModal from '../components/PlacementGroupModal';

interface PlacementGroup {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  daypart_hours: Record<string, any>;
  meal_stations: string[];
  templates: Record<string, any>;
  nfc_url: string | null;
  created_at: string;
}

interface StoreManagementProps {
  onBack: () => void;
}

export default function StoreManagement({ onBack }: StoreManagementProps) {
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PlacementGroup | null>(null);

  useEffect(() => {
    loadPlacementGroups();
  }, []);

  const loadPlacementGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('placement_groups')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading placement groups:', error);
      alert(`Failed to load placement groups: ${error.message}`);
    } else {
      setPlacementGroups(data || []);
    }
    setLoading(false);
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
                <p className="text-xs text-slate-500">Configure placement groups and settings</p>
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
            <h2 className="text-xl font-bold text-slate-900 mb-2">Placement Groups</h2>
            <p className="text-slate-600">
              Organize your store with hierarchical placement groups. Each group can inherit settings from its parent and define attributes like dayparts, meal stations, templates, and NFC URLs.
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin" />
              </div>
            ) : placementGroups.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No placement groups</h3>
                <p className="text-slate-600 mb-4">
                  Create your first placement group to organize your store
                </p>
                <button
                  onClick={handleAddGroup}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Placement Group
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {placementGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <Store className="w-5 h-5 text-amber-600 flex-shrink-0" />
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
                        title="Edit placement group"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {group.name !== '36355 - WAND Digital Demo' && (
                        <button
                          onClick={() => handleDeleteGroup(group)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete placement group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
