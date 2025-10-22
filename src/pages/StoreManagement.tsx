import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ChevronRight, ChevronDown, Edit2, Trash2, FolderTree } from 'lucide-react';
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
  updated_at: string;
}

interface StoreManagementProps {
  onBack: () => void;
}

export default function StoreManagement({ onBack }: StoreManagementProps) {
  const [groups, setGroups] = useState<PlacementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PlacementGroup | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);


  const loadGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('placement_groups')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading placement groups:', error);
      setLoading(false);
      return;
    }

    const groups = data || [];
    setGroups(groups);
    setLoading(false);

    // Check if default placement group exists and needs configuration
    const defaultGroup = groups.find(g => g.name === '36355 - WAND Digital Demo');

    if (defaultGroup) {
      // Check if required fields are configured
      const hasConfiguration =
        Object.keys(defaultGroup.daypart_hours || {}).length > 0 ||
        (defaultGroup.meal_stations && defaultGroup.meal_stations.length > 0) ||
        Object.keys(defaultGroup.templates || {}).length > 0 ||
        defaultGroup.nfc_url;

      if (!hasConfiguration) {
        // Open modal to configure
        setEditingGroup(defaultGroup);
        setShowModal(true);
      }
    }
  };


  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleDelete = async (id: string) => {
    const groupToDelete = groups.find(g => g.id === id);
    if (groupToDelete?.name === '36355 - WAND Digital Demo') {
      alert('Cannot delete the default store placement group');
      return;
    }

    if (!confirm('Are you sure you want to delete this placement group?')) {
      return;
    }

    const { error } = await supabase
      .from('placement_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete placement group');
    } else {
      loadGroups();
    }
  };

  const handleEdit = (group: PlacementGroup) => {
    setEditingGroup(group);
    setShowModal(true);
  };

  const handleAddRoot = () => {
    setEditingGroup(null);
    setShowModal(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingGroup({ parent_id: parentId } as PlacementGroup);
    setShowModal(true);
  };

  const buildTree = (parentId: string | null = null, level: number = 0): JSX.Element[] => {
    const children = groups.filter(g => g.parent_id === parentId);

    return children.map(group => {
      const hasChildren = groups.some(g => g.parent_id === group.id);
      const isExpanded = expandedNodes.has(group.id);
      const isDefaultLocation = group.name === '36355 - WAND Digital Demo';

      return (
        <div key={group.id}>
          <div
            className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg group transition-colors"
            style={{ marginLeft: `${level * 24}px` }}
          >
            <button
              onClick={() => toggleNode(group.id)}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>

            <FolderTree className="w-5 h-5 text-amber-600" />

            <div className="flex-1">
              <h4 className="font-medium text-slate-900">{group.name}</h4>
              {group.description && (
                <p className="text-sm text-slate-500">{group.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleAddChild(group.id)}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                title="Add child group"
              >
                <Plus className="w-4 h-4 text-green-600" />
              </button>
              <button
                onClick={() => handleEdit(group)}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="Edit group"
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
              </button>
              {!isDefaultLocation && (
                <button
                  onClick={() => handleDelete(group.id)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete group"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>
          </div>

          {isExpanded && buildTree(group.id, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
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
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                <FolderTree className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Store Management</h1>
                <p className="text-xs text-slate-500">Configure placement groups and settings</p>
              </div>
            </div>
            <button
              onClick={() => {
                const defaultLocation = groups.find(g => g.name === '36355 - WAND Digital Demo');
                if (defaultLocation) {
                  handleAddChild(defaultLocation.id);
                } else {
                  handleAddRoot();
                }
              }}
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

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No placement groups yet</h3>
                <p className="text-slate-600 mb-6">
                  Get started by creating your first placement group
                </p>
                <button
                  onClick={handleAddRoot}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Placement Group
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {buildTree()}
              </div>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <PlacementGroupModal
          group={editingGroup}
          availableParents={groups.filter(g => !editingGroup || g.id !== editingGroup.id)}
          onClose={() => {
            setShowModal(false);
            setEditingGroup(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingGroup(null);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}
