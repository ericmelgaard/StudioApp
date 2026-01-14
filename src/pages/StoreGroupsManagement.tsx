import { useState, useEffect } from 'react';
import {
  ArrowLeft, Layers, Search, Plus, Edit2, Trash2, Monitor, Users,
  Palette, Calendar, ImageOff, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreateGroupModal from '../components/CreateGroupModal';
import EditGroupPage from './EditGroupPage';
import GroupSchedulesPage from './GroupSchedulesPage';
import GroupDevicesPage from './GroupDevicesPage';

interface StoreGroupsManagementProps {
  storeId: number;
  storeName: string;
  onBack: () => void;
}

interface PlacementGroup {
  id: string;
  name: string;
  description: string | null;
  store_id: number;
  is_store_root: boolean;
  created_at: string;
  theme?: {
    id: string;
    name: string;
    icon: string | null;
    icon_url: string | null;
  } | null;
  device_count: number;
  online_devices: number;
  schedule_count: number;
}

interface MediaPlayer {
  id: string;
  name: string;
  status: string;
}

type PageView = 'list' | 'edit' | 'schedules' | 'devices';

export default function StoreGroupsManagement({ storeId, storeName, onBack }: StoreGroupsManagementProps) {
  const [groups, setGroups] = useState<PlacementGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<PlacementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentView, setCurrentView] = useState<PageView>('list');
  const [selectedGroup, setSelectedGroup] = useState<PlacementGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, [storeId]);

  useEffect(() => {
    filterGroups();
  }, [searchQuery, groups]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data: placementGroups, error: pgError } = await supabase
        .from('placement_groups')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_store_root', false)
        .order('name');

      if (pgError) throw pgError;

      const { data: mediaPlayers, error: mpError } = await supabase
        .from('media_players')
        .select('id, name, placement_group_id, status')
        .eq('store_id', storeId);

      if (mpError) throw mpError;

      const { data: schedules, error: schedError } = await supabase
        .from('placement_routines')
        .select('placement_id');

      if (schedError) throw schedError;

      const { data: themes, error: themesError } = await supabase
        .from('themes')
        .select('id, name, icon, icon_url');

      if (themesError) throw themesError;

      const groupsWithData = await Promise.all(
        (placementGroups || []).map(async (group) => {
          const devices = mediaPlayers?.filter(mp => mp.placement_group_id === group.id) || [];
          const onlineDevices = devices.filter(d => d.status === 'online').length;
          const scheduleCount = schedules?.filter(s => s.placement_id === group.id).length || 0;

          let theme = null;
          if (group.templates?.theme_id) {
            theme = themes?.find(t => t.id === group.templates.theme_id) || null;
          }

          return {
            ...group,
            theme,
            device_count: devices.length,
            online_devices: onlineDevices,
            schedule_count: scheduleCount
          };
        })
      );

      setGroups(groupsWithData);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterGroups = () => {
    if (!searchQuery) {
      setFilteredGroups(groups);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query) ||
      group.theme?.name.toLowerCase().includes(query)
    );

    setFilteredGroups(filtered);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? Devices in this group will be unassigned.')) {
      return;
    }

    setDeletingGroup(groupId);
    try {
      const { error } = await supabase
        .from('placement_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    } finally {
      setDeletingGroup(null);
    }
  };

  const stats = {
    totalGroups: groups.length,
    totalDevices: groups.reduce((sum, g) => sum + g.device_count, 0),
    unassignedDevices: 0
  };

  const handleEditGroup = (group: PlacementGroup) => {
    setSelectedGroup(group);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedGroup(null);
    loadGroups();
  };

  const handleNavigateToSchedules = () => {
    setCurrentView('schedules');
  };

  const handleNavigateToDevices = () => {
    setCurrentView('devices');
  };

  if (currentView === 'edit' && selectedGroup) {
    return (
      <EditGroupPage
        group={selectedGroup}
        storeId={storeId}
        onBack={handleBackToList}
        onNavigateToSchedules={handleNavigateToSchedules}
        onNavigateToDevices={handleNavigateToDevices}
      />
    );
  }

  if (currentView === 'schedules' && selectedGroup) {
    return (
      <GroupSchedulesPage
        group={{ id: selectedGroup.id, name: selectedGroup.name }}
        onBack={() => setCurrentView('edit')}
      />
    );
  }

  if (currentView === 'devices' && selectedGroup) {
    return (
      <GroupDevicesPage
        group={{ id: selectedGroup.id, name: selectedGroup.name }}
        storeId={storeId}
        onBack={() => setCurrentView('edit')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Placement Groups</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{storeName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create Group</span>
          </button>
        </div>

        <div className="px-4 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            <div className="flex-shrink-0 bg-white dark:bg-slate-700 rounded-lg px-4 py-3 min-w-[120px] border border-slate-200 dark:border-slate-600">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Groups</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalGroups}</p>
            </div>
            <div className="flex-shrink-0 bg-white dark:bg-slate-700 rounded-lg px-4 py-3 min-w-[120px] border border-slate-200 dark:border-slate-600">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Assigned Devices</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalDevices}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <Layers className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              {searchQuery ? 'No groups found' : 'No placement groups yet'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first placement group to organize displays'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit group"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={deletingGroup === group.id}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete group"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {group.device_count} {group.device_count === 1 ? 'device' : 'devices'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {group.online_devices} online
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {group.schedule_count} {group.schedule_count === 1 ? 'schedule' : 'schedules'}
                      </span>
                    </div>
                    {group.theme ? (
                      <div className="flex items-center gap-2">
                        {group.theme.icon_url ? (
                          <img
                            src={group.theme.icon_url}
                            alt={group.theme.name}
                            className="w-4 h-4 object-contain"
                          />
                        ) : group.theme.icon ? (
                          <Palette className="w-4 h-4 text-purple-500" />
                        ) : (
                          <ImageOff className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {group.theme.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        <span className="text-sm text-slate-400 dark:text-slate-500">No theme</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleEditGroup(group)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Manage Group
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal
          storeId={storeId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}
