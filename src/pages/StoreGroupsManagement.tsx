import { useState, useEffect } from 'react';
import {
  ArrowLeft, Layers, Plus, Palette, ImageOff, ChevronRight
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
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentView, setCurrentView] = useState<PageView>('list');
  const [selectedGroup, setSelectedGroup] = useState<PlacementGroup | null>(null);

  useEffect(() => {
    loadGroups();
  }, [storeId]);

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
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100">Placement Groups</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{storeName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Create Group</span>
          </button>
        </div>
      </div>

      <div className="p-3 md:p-4">

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <Layers className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-2">
              No placement groups yet
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Create your first placement group to organize displays
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-3">
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 line-clamp-2">
                    {group.name}
                  </h3>

                  {group.theme ? (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                      {group.theme.icon_url ? (
                        <img
                          src={group.theme.icon_url}
                          alt={group.theme.name}
                          className="w-5 h-5 object-contain flex-shrink-0"
                        />
                      ) : (
                        <Palette className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Theme</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                          {group.theme.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                      <ImageOff className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Theme</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">No theme</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleEditGroup(group)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
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
