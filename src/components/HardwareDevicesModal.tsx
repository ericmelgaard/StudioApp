import { useState, useEffect } from 'react';
import { X, Cpu, Plus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HardwareDevice } from '../types/labels';

interface HardwareDevicesModalProps {
  onClose: () => void;
}

export default function HardwareDevicesModal({ onClose }: HardwareDevicesModalProps) {
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    device_id: '',
    device_type: '',
    notes: '',
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    const { data, error } = await supabase
      .from('hardware_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading devices:', error);
      setLoading(false);
      return;
    }

    setDevices(data || []);
    setLoading(false);
  };

  const generateActivationId = () => {
    const randomPart1 = Math.random().toString(36).substring(2, 10).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HW-${randomPart1}-${randomPart2}`;
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    const activationId = generateActivationId();

    const { error } = await supabase
      .from('hardware_devices')
      .insert({
        device_id: formData.device_id,
        device_type: formData.device_type,
        status: 'activated',
        notes: formData.notes,
        activation_id: activationId,
        client_version: '4.6.5',
        activated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error adding device:', error);
      return;
    }

    setFormData({ device_id: '', device_type: '', notes: '' });
    setShowAddForm(false);
    loadDevices();
  };

  const filteredDevices = devices.filter(
    (device) =>
      device.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.device_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'activated':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'maintenance':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'retired':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const statusCounts = devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hardware Devices</h2>
            <p className="text-sm text-slate-600 mt-1">
              Manage physical label devices and inventory
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200 space-y-4">
          <div className="grid grid-cols-5 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs text-emerald-700 mb-1">Activated</p>
              <p className="text-xl font-bold text-emerald-900">{statusCounts.activated || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 mb-1">Assigned</p>
              <p className="text-xl font-bold text-blue-900">{statusCounts.assigned || 0}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 mb-1">Available</p>
              <p className="text-xl font-bold text-green-900">{statusCounts.available || 0}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700 mb-1">Maintenance</p>
              <p className="text-xl font-bold text-amber-900">{statusCounts.maintenance || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-700 mb-1">Retired</p>
              <p className="text-xl font-bold text-slate-900">{statusCounts.retired || 0}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Device
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddDevice} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  required
                  placeholder="Device ID *"
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  required
                  placeholder="Device Type *"
                  value={formData.device_type}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Add Device
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-green-500" />
              <p className="mt-4 text-slate-600">Loading devices...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Cpu className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No devices found</p>
              <p className="text-sm mt-2">
                {searchQuery ? 'Try adjusting your search' : 'Add hardware devices to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <Cpu className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{device.device_id}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-slate-600">{device.device_type}</p>
                        {device.activation_id && (
                          <>
                            <span className="text-slate-300">•</span>
                            <p className="text-xs font-mono text-slate-500">{device.activation_id}</p>
                          </>
                        )}
                        {device.client_version && (
                          <>
                            <span className="text-slate-300">•</span>
                            <p className="text-xs text-slate-500">v{device.client_version}</p>
                          </>
                        )}
                      </div>
                      {device.notes && (
                        <p className="text-xs text-slate-500 mt-1">{device.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {device.battery_level !== null && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Battery</p>
                        <p className="text-sm font-medium text-slate-900">{device.battery_level}%</p>
                      </div>
                    )}
                    <span className={`text-xs font-medium px-3 py-1.5 rounded border ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
