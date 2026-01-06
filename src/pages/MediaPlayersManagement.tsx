import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Search, Monitor, MapPin, Users, Layers } from 'lucide-react';
import BulkAddMediaPlayersModal from '../components/BulkAddMediaPlayersModal';

interface MediaPlayer {
  id: string;
  name: string;
  device_id: string;
  hardware_device_id: string | null;
  ip_address: string | null;
  mac_address: string | null;
  status: string;
  last_heartbeat: string | null;
  firmware_version: string | null;
  placement_group_id: string | null;
  store_id: number | null;
  created_at: string;
  hardware_device?: {
    device_id: string;
    device_type: string;
    status: string;
  } | null;
  store?: {
    id: number;
    name: string;
  } | null;
  placement_group?: {
    id: string;
    name: string;
  } | null;
  display_count?: number;
}

interface HardwareDevice {
  id: string;
  device_id: string;
  device_type: string;
  status: string;
}

interface Store {
  id: number;
  name: string;
}

interface PlacementGroup {
  id: string;
  name: string;
}

export default function MediaPlayersManagement() {
  const [mediaPlayers, setMediaPlayers] = useState<MediaPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<MediaPlayer[]>([]);
  const [availableDevices, setAvailableDevices] = useState<HardwareDevice[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<MediaPlayer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    hardware_device_id: '',
    store_id: '',
    placement_group_id: '',
    ip_address: '',
    firmware_version: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchTerm, statusFilter, mediaPlayers]);

  const loadData = async () => {
    try {
      const [playersRes, devicesRes, storesRes, groupsRes, displaysRes] = await Promise.all([
        supabase.from('media_players').select('*, hardware_devices(*), stores(id, name), placement_groups(id, name)').order('name'),
        supabase.from('hardware_devices').select('*').in('status', ['available']).order('device_id'),
        supabase.from('stores').select('id, name').order('name'),
        supabase.from('placement_groups').select('id, name').order('name'),
        supabase.from('displays').select('media_player_id')
      ]);

      if (playersRes.error) throw playersRes.error;
      if (devicesRes.error) throw devicesRes.error;
      if (storesRes.error) throw storesRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (displaysRes.error) throw displaysRes.error;

      const displayCounts = displaysRes.data.reduce((acc, display) => {
        acc[display.media_player_id] = (acc[display.media_player_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const playersWithCounts = playersRes.data.map((player: any) => ({
        ...player,
        hardware_device: player.hardware_devices,
        store: player.stores,
        placement_group: player.placement_groups,
        display_count: displayCounts[player.id] || 0
      }));

      setMediaPlayers(playersWithCounts);
      setAvailableDevices(devicesRes.data);
      setStores(storesRes.data);
      setPlacementGroups(groupsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = mediaPlayers;

    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.hardware_device?.device_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(player => player.status === statusFilter);
    }

    setFilteredPlayers(filtered);
  };

  const handleOpenModal = (player?: MediaPlayer) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        name: player.name,
        hardware_device_id: player.hardware_device_id || '',
        store_id: player.store_id?.toString() || '',
        placement_group_id: player.placement_group_id || '',
        ip_address: player.ip_address || '',
        firmware_version: player.firmware_version || ''
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        name: '',
        hardware_device_id: '',
        store_id: '',
        placement_group_id: '',
        ip_address: '',
        firmware_version: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlayer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const deviceId = `MP-${Date.now()}`;

      if (editingPlayer) {
        const updates: any = {
          name: formData.name,
          hardware_device_id: formData.hardware_device_id || null,
          store_id: formData.store_id ? parseInt(formData.store_id) : null,
          placement_group_id: formData.placement_group_id || null,
          ip_address: formData.ip_address || null,
          firmware_version: formData.firmware_version || null,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('media_players')
          .update(updates)
          .eq('id', editingPlayer.id);

        if (error) throw error;

        if (formData.hardware_device_id && formData.hardware_device_id !== editingPlayer.hardware_device_id) {
          if (editingPlayer.hardware_device_id) {
            await supabase
              .from('hardware_devices')
              .update({ status: 'available' })
              .eq('id', editingPlayer.hardware_device_id);
          }

          await supabase
            .from('hardware_devices')
            .update({ status: 'assigned' })
            .eq('id', formData.hardware_device_id);
        }
      } else {
        const { error } = await supabase
          .from('media_players')
          .insert({
            device_id: deviceId,
            name: formData.name,
            hardware_device_id: formData.hardware_device_id || null,
            store_id: formData.store_id ? parseInt(formData.store_id) : null,
            placement_group_id: formData.placement_group_id || null,
            ip_address: formData.ip_address || null,
            firmware_version: formData.firmware_version || null,
            status: 'offline'
          });

        if (error) throw error;

        if (formData.hardware_device_id) {
          await supabase
            .from('hardware_devices')
            .update({ status: 'assigned' })
            .eq('id', formData.hardware_device_id);
        }
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving media player:', error);
      alert('Failed to save media player');
    }
  };

  const handleDelete = async (player: MediaPlayer) => {
    if (player.display_count && player.display_count > 0) {
      alert(`Cannot delete "${player.name}" because it has ${player.display_count} display(s) attached. Please remove the displays first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${player.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('media_players')
        .delete()
        .eq('id', player.id);

      if (error) throw error;

      if (player.hardware_device_id) {
        await supabase
          .from('hardware_devices')
          .update({ status: 'available' })
          .eq('id', player.hardware_device_id);
      }

      await loadData();
    } catch (error) {
      console.error('Error deleting media player:', error);
      alert('Failed to delete media player');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading media players...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Media Players</h1>
            <p className="text-gray-600 mt-1">Manage logical media player configurations</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Bulk Add
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Media Player
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search media players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="error">Error</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hardware Device
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Store
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Placement Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Displays
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPlayers.map((player) => (
              <tr key={player.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{player.name}</div>
                      <div className="text-xs text-gray-500">{player.device_id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {player.hardware_device ? (
                    <div>
                      <div className="text-sm text-gray-900">{player.hardware_device.device_id}</div>
                      <div className="text-xs text-gray-500">{player.hardware_device.device_type}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">No device assigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {player.store ? (
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {player.store.name}
                    </div>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {player.placement_group ? (
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Users className="w-4 h-4 text-gray-400" />
                      {player.placement_group.name}
                    </div>
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(player.status)}`}>
                    {player.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {player.display_count || 0} display{player.display_count !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(player)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(player)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <Monitor className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No media players found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating a new media player'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPlayer ? 'Edit Media Player' : 'Create Media Player'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Front Counter Display"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hardware Device
                </label>
                <select
                  value={formData.hardware_device_id}
                  onChange={(e) => setFormData({ ...formData, hardware_device_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No device assigned</option>
                  {editingPlayer?.hardware_device && (
                    <option value={editingPlayer.hardware_device_id!}>
                      {editingPlayer.hardware_device.device_id} (Current)
                    </option>
                  )}
                  {availableDevices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.device_id} - {device.device_type}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only available devices are shown
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store
                </label>
                <select
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No store assigned</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placement Group
                </label>
                <select
                  value={formData.placement_group_id}
                  onChange={(e) => setFormData({ ...formData, placement_group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No placement group</option>
                  {placementGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="192.168.1.100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firmware Version
                </label>
                <input
                  type="text"
                  value={formData.firmware_version}
                  onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="v1.0.0"
                />
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingPlayer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkAddModal && (
        <BulkAddMediaPlayersModal
          onClose={() => setShowBulkAddModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
