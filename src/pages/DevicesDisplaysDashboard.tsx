import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Monitor, Cpu, Layers, Grid } from 'lucide-react';
import DisplayTypesManagement from './DisplayTypesManagement';
import HardwareDevicesManagement from './HardwareDevicesManagement';
import MediaPlayersManagement from './MediaPlayersManagement';
import DisplaysManagement from './DisplaysManagement';
import { useLocation } from '../hooks/useLocation';

type Tab = 'overview' | 'display-types' | 'hardware' | 'media-players' | 'displays';

interface Stats {
  displayTypes: {
    total: number;
    active: number;
  };
  hardwareDevices: {
    total: number;
    available: number;
    assigned: number;
    maintenance: number;
    retired: number;
  };
  mediaPlayers: {
    total: number;
    online: number;
    offline: number;
  };
  displays: {
    total: number;
    active: number;
    inactive: number;
  };
}

export default function DevicesDisplaysDashboard() {
  const { location } = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats>({
    displayTypes: { total: 0, active: 0 },
    hardwareDevices: { total: 0, available: 0, assigned: 0, maintenance: 0, retired: 0 },
    mediaPlayers: { total: 0, online: 0, offline: 0 },
    displays: { total: 0, active: 0, inactive: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    }
  }, [activeTab, location]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Display types are global, no filtering needed
      let playersQuery = supabase.from('media_players').select('status, stores!inner(id, company_id, companies!inner(id, concept_id))');
      let displaysQuery = supabase.from('displays').select('status, media_players!inner(stores!inner(id, company_id, companies!inner(id, concept_id)))');

      // Filter based on location
      if (location.store) {
        playersQuery = playersQuery.eq('stores.id', location.store.id);
        displaysQuery = displaysQuery.eq('media_players.stores.id', location.store.id);
      } else if (location.company) {
        playersQuery = playersQuery.eq('stores.company_id', location.company.id);
        displaysQuery = displaysQuery.eq('media_players.stores.company_id', location.company.id);
      } else if (location.concept) {
        playersQuery = playersQuery.eq('stores.companies.concept_id', location.concept.id);
        displaysQuery = displaysQuery.eq('media_players.stores.companies.concept_id', location.concept.id);
      }

      const [typesRes, devicesRes, playersRes, displaysRes] = await Promise.all([
        supabase.from('display_types').select('status'),
        supabase.from('hardware_devices').select('status'),
        playersQuery,
        displaysQuery
      ]);

      if (typesRes.error) throw typesRes.error;
      if (devicesRes.error) throw devicesRes.error;
      if (playersRes.error) throw playersRes.error;
      if (displaysRes.error) throw displaysRes.error;

      setStats({
        displayTypes: {
          total: typesRes.data.length,
          active: typesRes.data.filter(t => t.status === 'active').length
        },
        hardwareDevices: {
          total: devicesRes.data.length,
          available: devicesRes.data.filter(d => d.status === 'available').length,
          assigned: devicesRes.data.filter(d => d.status === 'assigned').length,
          maintenance: devicesRes.data.filter(d => d.status === 'maintenance').length,
          retired: devicesRes.data.filter(d => d.status === 'retired').length
        },
        mediaPlayers: {
          total: playersRes.data.length,
          online: playersRes.data.filter(p => p.status === 'online').length,
          offline: playersRes.data.filter(p => p.status === 'offline').length
        },
        displays: {
          total: displaysRes.data.length,
          active: displaysRes.data.filter(d => d.status === 'active').length,
          inactive: displaysRes.data.filter(d => d.status === 'inactive').length
        }
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as Tab, name: 'Overview', icon: Grid },
    { id: 'display-types' as Tab, name: 'Display Types', icon: Layers },
    { id: 'hardware' as Tab, name: 'Hardware Devices', icon: Cpu },
    { id: 'media-players' as Tab, name: 'Signage Players', icon: Monitor },
    { id: 'displays' as Tab, name: 'Displays', icon: Monitor }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">Devices & Displays</h1>
            <p className="text-gray-600 mt-1">Manage display hardware, signage players, shelf labels, and display configurations</p>
          </div>
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'overview' && (
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-300">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <p className="mt-6 text-gray-600 font-medium">Loading statistics...</p>
                <p className="mt-2 text-sm text-gray-400">Fetching data for {location.store?.name || location.company?.name || location.concept?.name || 'all locations'}</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                {(location.store || location.company || location.concept) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Viewing statistics for:</span> {location.store?.name || location.company?.name || location.concept?.name}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Display Types</h3>
                      <Layers className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{stats.displayTypes.total}</div>
                    <div className="text-sm text-gray-600">
                      {stats.displayTypes.active} active
                    </div>
                    <button
                      onClick={() => setActiveTab('display-types')}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Manage Display Types →
                    </button>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Hardware Devices</h3>
                      <Cpu className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{stats.hardwareDevices.total}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <span className="font-medium text-green-600">{stats.hardwareDevices.available}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assigned:</span>
                        <span className="font-medium text-blue-600">{stats.hardwareDevices.assigned}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('hardware')}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Manage Hardware →
                    </button>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Signage Players</h3>
                      <Monitor className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{stats.mediaPlayers.total}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Online:</span>
                        <span className="font-medium text-green-600">{stats.mediaPlayers.online}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Offline:</span>
                        <span className="font-medium text-gray-600">{stats.mediaPlayers.offline}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('media-players')}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Manage Signage Players →
                    </button>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Displays</h3>
                      <Monitor className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{stats.displays.total}</div>
                    <div className="text-sm text-gray-600">
                      {stats.displays.active} active
                    </div>
                    <button
                      onClick={() => setActiveTab('displays')}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Manage Displays →
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">System Architecture</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold text-gray-900">Hardware Devices</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Physical media player devices (Raspberry Pi, Intel NUC, etc.) that can be assigned to logical media players
                      </p>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold text-gray-900">Media Players</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Logical wrappers for hardware devices that persist when hardware is replaced. Assigned to stores and placement groups
                      </p>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-900">Display Types</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Content templates defining resolution, orientation, and purpose (e.g., Snacks, Drinks, Vertical 1-10)
                      </p>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900">Displays</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Final pairing of media player + display type. Each media player can have up to 2 displays (dual-screen support)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Hardware Replacement Workflow</h3>
                  <p className="text-sm text-blue-800">
                    When a hardware device fails, you can replace it without losing any configuration. Simply edit the media player
                    and select a new available hardware device. All store assignments, placement groups, and displays remain intact.
                    The old hardware device is automatically marked as retired, and the new device is marked as assigned.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'display-types' && <DisplayTypesManagement />}
        {activeTab === 'hardware' && <HardwareDevicesManagement />}
        {activeTab === 'media-players' && <MediaPlayersManagement />}
        {activeTab === 'displays' && <DisplaysManagement />}
      </div>
    </div>
  );
}
