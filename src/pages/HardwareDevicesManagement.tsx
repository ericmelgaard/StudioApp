import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Search, Cpu, AlertCircle, Tag, Battery, Signal, Wifi, WifiOff, Package } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';

interface HardwareDevice {
  id: string;
  device_id: string;
  device_type: string;
  usage_type: string;
  mac_address: string | null;
  serial_number: string | null;
  status: string;
  notes: string | null;
  last_seen: string | null;
  created_at: string;
  media_player?: {
    id: string;
    name: string;
  } | null;
  // ESL-specific fields
  battery_status?: string | null;
  signal_strength?: string | null;
  label_type?: string | null;
  firmware_version?: string | null;
  network_status?: boolean | null;
  template_name?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  last_response_time?: string | null;
  sync_status?: string | null;
}

export default function HardwareDevicesManagement() {
  const { location } = useLocation();
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<HardwareDevice | null>(null);
  const [formData, setFormData] = useState({
    device_id: '',
    device_type: 'raspberry_pi',
    mac_address: '',
    serial_number: '',
    status: 'available',
    notes: ''
  });

  useEffect(() => {
    loadDevices();
  }, [location]);

  useEffect(() => {
    filterDevices();
  }, [searchTerm, statusFilter, typeFilter, devices]);

  const loadDevices = async () => {
    try {
      // Get relevant store IDs based on current location
      let storeIds: number[] = [];

      if (location.store) {
        // Single store selected
        storeIds = [location.store.id];
      } else if (location.group) {
        // Get all stores in this group
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('location_group_id', location.group.id);
        storeIds = stores?.map(s => s.id) || [];
      } else if (location.company) {
        // Get all stores in all groups under this company
        const { data: groups } = await supabase
          .from('location_groups')
          .select('id')
          .eq('company_id', location.company.id);
        const groupIds = groups?.map(g => g.id) || [];

        if (groupIds.length > 0) {
          const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .in('location_group_id', groupIds);
          storeIds = stores?.map(s => s.id) || [];
        }
      } else if (location.concept) {
        // Get all stores under all companies in this concept
        const { data: companies } = await supabase
          .from('companies')
          .select('id')
          .eq('concept_id', location.concept.id);
        const companyIds = companies?.map(c => c.id) || [];

        if (companyIds.length > 0) {
          const { data: groups } = await supabase
            .from('location_groups')
            .select('id')
            .in('company_id', companyIds);
          const groupIds = groups?.map(g => g.id) || [];

          if (groupIds.length > 0) {
            const { data: stores } = await supabase
              .from('stores')
              .select('id')
              .in('location_group_id', groupIds);
            storeIds = stores?.map(s => s.id) || [];
          }
        }
      }

      // Get media players for the relevant stores
      let mediaPlayersQuery = supabase
        .from('media_players')
        .select('id, name, hardware_device_id, store_id');

      if (storeIds.length > 0) {
        mediaPlayersQuery = mediaPlayersQuery.in('store_id', storeIds);
      }

      const { data: mediaPlayers, error: playersError } = await mediaPlayersQuery;
      if (playersError) throw playersError;

      // Get hardware device IDs that are assigned to these media players
      const assignedDeviceIds = new Set(
        mediaPlayers?.filter(mp => mp.hardware_device_id).map(mp => mp.hardware_device_id) || []
      );

      // Get all hardware devices
      const { data: devicesData, error: devicesError } = await supabase
        .from('hardware_devices')
        .select('*')
        .order('device_id');

      if (devicesError) throw devicesError;

      // Filter to only show devices relevant to current location:
      // - If location is selected: show devices assigned to media players in that location + available devices
      // - If no location: show all devices
      let filteredDevices = devicesData;
      if (storeIds.length > 0) {
        filteredDevices = devicesData.filter(device =>
          device.status === 'available' || assignedDeviceIds.has(device.id)
        );
      }

      const devicesWithPlayers = filteredDevices.map(device => ({
        ...device,
        media_player: mediaPlayers?.find(mp => mp.hardware_device_id === device.id) || null
      }));

      setDevices(devicesWithPlayers);
    } catch (error) {
      console.error('Error loading hardware devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDevices = () => {
    let filtered = devices;

    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => device.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(device => device.device_type === typeFilter);
    }

    setFilteredDevices(filtered);
  };

  const handleOpenModal = (device?: HardwareDevice) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        device_id: device.device_id,
        device_type: device.device_type,
        mac_address: device.mac_address || '',
        serial_number: device.serial_number || '',
        status: device.status,
        notes: device.notes || ''
      });
    } else {
      setEditingDevice(null);
      setFormData({
        device_id: '',
        device_type: 'raspberry_pi',
        mac_address: '',
        serial_number: '',
        status: 'available',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDevice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDevice) {
        const { error } = await supabase
          .from('hardware_devices')
          .update({
            device_id: formData.device_id,
            device_type: formData.device_type,
            mac_address: formData.mac_address || null,
            serial_number: formData.serial_number || null,
            status: formData.status,
            notes: formData.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDevice.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hardware_devices')
          .insert({
            device_id: formData.device_id,
            device_type: formData.device_type,
            mac_address: formData.mac_address || null,
            serial_number: formData.serial_number || null,
            status: formData.status,
            notes: formData.notes || null
          });

        if (error) throw error;
      }

      await loadDevices();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving hardware device:', error);
      alert('Failed to save hardware device');
    }
  };

  const handleDelete = async (device: HardwareDevice) => {
    if (device.media_player) {
      alert(`Cannot delete "${device.device_id}" because it is assigned to media player "${device.media_player.name}". Please unassign it first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${device.device_id}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('hardware_devices')
        .delete()
        .eq('id', device.id);

      if (error) throw error;

      await loadDevices();
    } catch (error) {
      console.error('Error deleting hardware device:', error);
      alert('Failed to delete hardware device');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'retired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceTypeIcon = (type: string) => {
    if (type.startsWith('esl_')) {
      return <Tag className="w-5 h-5 text-orange-500" />;
    }
    return <Cpu className="w-5 h-5 text-gray-400" />;
  };

  const isESLDevice = (device: HardwareDevice): boolean => {
    return device.device_type.startsWith('esl_') || device.label_type !== null;
  };

  const getBatteryStatusColor = (status: string | null | undefined): string => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toUpperCase()) {
      case 'GOOD': return 'bg-green-100 text-green-800';
      case 'LOW': return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSignalStrengthColor = (strength: string | null | undefined): string => {
    if (!strength) return 'text-gray-400';
    switch (strength.toUpperCase()) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-blue-600';
      case 'POOR': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string | null | undefined): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getStatusCount = (status: string) => {
    return devices.filter(d => d.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading hardware devices...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hardware Devices</h1>
            <p className="text-gray-600 mt-1">Manage physical media player hardware</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Available</div>
            <div className="text-2xl font-bold text-green-600">{getStatusCount('available')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Assigned</div>
            <div className="text-2xl font-bold text-blue-600">{getStatusCount('assigned')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Maintenance</div>
            <div className="text-2xl font-bold text-yellow-600">{getStatusCount('maintenance')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Retired</div>
            <div className="text-2xl font-bold text-gray-600">{getStatusCount('retired')}</div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="raspberry_pi">Raspberry Pi</option>
            <option value="intel_nuc">Intel NUC</option>
            <option value="android_box">Android Box</option>
            <option value="windows_pc">Windows PC</option>
            <option value="esl_42inch">4.2" ESL</option>
            <option value="esl_29inch">2.9" ESL</option>
            <option value="esl_75inch">7.5" ESL</option>
            <option value="other">Other</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Device ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDevices.map((device) => {
              const isESL = isESLDevice(device);
              return (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getDeviceTypeIcon(device.device_type)}
                      <div>
                        <div className="font-medium text-gray-900">{device.device_id}</div>
                        {device.serial_number && (
                          <div className="text-xs text-gray-500">
                            {isESL ? 'Label Code' : 'SN'}: {device.serial_number}
                          </div>
                        )}
                        {isESL && device.label_type && (
                          <div className="text-xs text-gray-500">
                            {device.label_type}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {device.device_type.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    {isESL && (
                      <div className="flex items-center gap-2 mt-1">
                        {device.battery_status && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getBatteryStatusColor(device.battery_status)}`}>
                            <Battery className="w-3 h-3" />
                            {device.battery_status}
                          </span>
                        )}
                        {device.signal_strength && (
                          <span className={`inline-flex items-center gap-1 text-xs ${getSignalStrengthColor(device.signal_strength)}`}>
                            <Signal className="w-3 h-3" />
                            {device.signal_strength}
                          </span>
                        )}
                        {device.network_status !== null && (
                          device.network_status ? (
                            <Wifi className="w-3 h-3 text-green-600" title="Online" />
                          ) : (
                            <WifiOff className="w-3 h-3 text-red-600" title="Offline" />
                          )
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                    {isESL && device.firmware_version && (
                      <div className="text-xs text-gray-500 mt-1">
                        FW: {device.firmware_version}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {device.media_player ? (
                        <div className="flex items-center gap-1">
                          <span>{device.media_player.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </div>
                    {isESL && device.product_name && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Package className="w-3 h-3" />
                        <span className="truncate max-w-[200px]" title={device.product_name}>
                          {device.product_name}
                        </span>
                      </div>
                    )}
                    {isESL && device.last_response_time && (
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(device.last_response_time)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {device.notes || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(device)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(device)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                        disabled={!!device.media_player}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <Cpu className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No devices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding a new device'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDevice ? 'Edit Hardware Device' : 'Add Hardware Device'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID *
                </label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DEVICE-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Type *
                </label>
                <select
                  value={formData.device_type}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="raspberry_pi">Raspberry Pi</option>
                  <option value="intel_nuc">Intel NUC</option>
                  <option value="android_box">Android Box</option>
                  <option value="windows_pc">Windows PC</option>
                  <option value="esl_42inch">4.2" ESL</option>
                  <option value="esl_29inch">2.9" ESL</option>
                  <option value="esl_75inch">7.5" ESL</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MAC Address
                </label>
                <input
                  type="text"
                  value={formData.mac_address}
                  onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00:1B:44:11:3A:B7"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="RPI-SN-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {editingDevice?.media_player && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    This device is currently assigned to media player "{editingDevice.media_player.name}".
                    Changes to the device will affect the media player configuration.
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
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
                  {editingDevice ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
