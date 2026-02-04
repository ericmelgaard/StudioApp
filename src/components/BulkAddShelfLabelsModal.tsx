import { useState, useEffect, FormEvent } from 'react';
import { X, Plus, AlertCircle, Tag, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LocationState } from '../hooks/useLocation';

interface BulkAddShelfLabelsModalProps {
  onClose: () => void;
  onSuccess: () => void;
  currentLocation: LocationState;
}

interface DisplayType {
  id: string;
  name: string;
  category: string;
}

interface HardwareDevice {
  id: string;
  device_id: string;
  device_type: string;
  serial_number: string | null;
  status: string;
  usage_type: string;
}

interface Store {
  id: number;
  name: string;
}

interface PlacementGroup {
  id: string;
  name: string;
  store_id: number;
}

export default function BulkAddShelfLabelsModal({ onClose, onSuccess, currentLocation }: BulkAddShelfLabelsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<HardwareDevice[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<HardwareDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectFirstN, setSelectFirstN] = useState<string>('50');
  const [formData, setFormData] = useState({
    prefix: 'ESL-',
    store_id: currentLocation.store ? currentLocation.store.id.toString() : '',
    placement_group_id: '',
    display_type_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [availableDevices, deviceTypeFilter, searchTerm]);

  const loadData = async () => {
    const [devicesRes, groupsRes, typesRes] = await Promise.all([
      supabase
        .from('hardware_devices')
        .select('*')
        .eq('status', 'available')
        .eq('usage_type', 'label')
        .order('device_id'),
      supabase
        .from('placement_groups')
        .select('id, name, store_id')
        .eq('store_id', currentLocation.store?.id || 0)
        .order('name'),
      supabase
        .from('display_types')
        .select('*')
        .eq('status', 'active')
        .eq('category', 'esl')
        .order('name')
    ]);

    if (devicesRes.data) setAvailableDevices(devicesRes.data);
    if (groupsRes.data) setPlacementGroups(groupsRes.data);
    if (typesRes.data) setDisplayTypes(typesRes.data);
  };

  const filterDevices = () => {
    let filtered = availableDevices;

    if (deviceTypeFilter !== 'all') {
      filtered = filtered.filter(d => d.device_type === deviceTypeFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.device_id.toLowerCase().includes(search) ||
        d.serial_number?.toLowerCase().includes(search)
      );
    }

    setFilteredDevices(filtered);
  };

  const toggleDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  const selectAll = () => {
    if (selectedDevices.size === filteredDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const handleSelectFirstN = () => {
    const limit = parseInt(selectFirstN);
    if (isNaN(limit) || limit <= 0) return;

    const firstN = filteredDevices.slice(0, limit).map(d => d.id);
    setSelectedDevices(new Set(firstN));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (selectedDevices.size === 0) {
        throw new Error('Please select at least one hardware device');
      }

      if (!formData.store_id) {
        throw new Error('Store is required');
      }

      if (!formData.display_type_id) {
        throw new Error('Display type is required');
      }

      const selectedHardware = availableDevices.filter(d => selectedDevices.has(d.id));

      const mediaPlayers = selectedHardware.map((device, index) => {
        const num = index + 1;
        const deviceId = `${formData.prefix}${num.toString().padStart(3, '0')}`;

        return {
          device_id: deviceId,
          name: `${formData.prefix}${device.device_id}`,
          player_type: 'label' as const,
          hardware_device_id: device.id,
          store_id: parseInt(formData.store_id),
          is_webview_kiosk: false,
          status: 'offline'
        };
      });

      const { data: insertedPlayers, error: playersError } = await supabase
        .from('media_players')
        .insert(mediaPlayers)
        .select();

      if (playersError) throw playersError;

      if (insertedPlayers) {
        const displays = insertedPlayers.map(player => ({
          name: `${player.name} Display`,
          media_player_id: player.id,
          display_type_id: formData.display_type_id,
          placement_group_id: formData.placement_group_id || null,
          position: 1,
          status: 'active'
        }));

        const { error: displaysError } = await supabase
          .from('displays')
          .insert(displays);

        if (displaysError) throw displaysError;
      }

      const deviceIds = Array.from(selectedDevices);
      await supabase
        .from('hardware_devices')
        .update({ status: 'assigned' })
        .in('id', deviceIds);

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shelf labels');
    } finally {
      setLoading(false);
    }
  };

  const uniqueDeviceTypes = Array.from(new Set(availableDevices.map(d => d.device_type)));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">Bulk Add Shelf Labels</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
            <p className="text-sm text-blue-700">
              Select the ESL hardware devices you want to set up. Each selected device will have a shelf label display created and assigned to it.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Store *
            </label>
            <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-blue-50 text-slate-900 font-medium">
              {currentLocation.store?.name || 'No store selected'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Shelf labels will be added to this store
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Display Type *
            </label>
            <select
              required
              value={formData.display_type_id}
              onChange={(e) => setFormData({ ...formData, display_type_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select display type</option>
              {displayTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              All shelf labels will use this display type
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Placement Group (Optional)
            </label>
            <select
              value={formData.placement_group_id}
              onChange={(e) => setFormData({ ...formData, placement_group_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No placement group</option>
              {placementGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Display ID Prefix
            </label>
            <input
              type="text"
              required
              value={formData.prefix}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ESL-"
            />
            <p className="text-xs text-slate-500 mt-1">
              This prefix will be used in the display IDs
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-medium text-slate-900 mb-3">Select Hardware Devices *</h3>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by device ID or serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>

                <select
                  value={deviceTypeFilter}
                  onChange={(e) => setDeviceTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">All ESL Types</option>
                  {uniqueDeviceTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('esl_', '').replace('inch', '"')} ESL
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {selectedDevices.size === filteredDevices.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Select first:</span>
                    <input
                      type="number"
                      min="1"
                      max={filteredDevices.length}
                      value={selectFirstN}
                      onChange={(e) => setSelectFirstN(e.target.value)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleSelectFirstN}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
                <span className="text-sm text-slate-600">
                  {selectedDevices.size} of {filteredDevices.length} selected
                </span>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredDevices.length === 0 ? (
                <div className="p-8 text-center">
                  <Tag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No available ESL hardware devices found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Add ESL hardware devices in the Hardware Devices tab first
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredDevices.map((device) => (
                    <label
                      key={device.id}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDevices.has(device.id)}
                        onChange={() => toggleDevice(device.id)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <Tag className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{device.device_id}</p>
                        {device.serial_number && (
                          <p className="text-xs text-slate-500">SN: {device.serial_number}</p>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        {device.device_type.replace('esl_', '').replace('inch', '"')} ESL
                      </div>
                      {selectedDevices.has(device.id) && (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedDevices.size > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Ready to create {selectedDevices.size} shelf labels</p>
                  <p className="text-sm text-green-700 mt-1">
                    {selectedDevices.size} display{selectedDevices.size !== 1 ? 's' : ''} will be created and assigned to the selected hardware devices
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedDevices.size === 0 || !formData.display_type_id}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating {selectedDevices.size} shelf labels...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create {selectedDevices.size} Shelf Label{selectedDevices.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
