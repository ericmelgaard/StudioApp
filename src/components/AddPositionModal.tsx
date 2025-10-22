import { useState, useEffect, FormEvent } from 'react';
import { X, Plus, Cpu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HardwareDevice } from '../types/labels';

interface AddPositionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPositionModal({ onClose, onSuccess }: AddPositionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<HardwareDevice[]>([]);
  const [placementGroups, setPlacementGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    position_id: '',
    hardware_device_id: '',
    placement_group: '',
  });

  useEffect(() => {
    loadAvailableDevices();
    loadPlacementGroups();
  }, []);

  const loadAvailableDevices = async () => {
    const { data, error } = await supabase
      .from('hardware_devices')
      .select('*')
      .eq('status', 'available')
      .order('device_id');

    if (error) {
      console.error('Error loading devices:', error);
      return;
    }

    setAvailableDevices(data || []);
  };

  const loadPlacementGroups = async () => {
    const { data, error } = await supabase
      .from('placement_groups')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error loading placement groups:', error);
      return;
    }

    setPlacementGroups(data || []);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const selectedDevice = availableDevices.find(d => d.id === formData.hardware_device_id);
      if (!selectedDevice) {
        throw new Error('Please select a hardware device');
      }

      const { error: insertError } = await supabase
        .from('label_positions')
        .insert({
          position_id: formData.position_id,
          product_name: `${selectedDevice.device_id} (${selectedDevice.device_type})`,
          price: 0,
          location: formData.placement_group,
          hardware_device_id: selectedDevice.id,
          status: 'pending',
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('hardware_devices')
        .update({ status: 'assigned' })
        .eq('id', selectedDevice.id);

      if (updateError) {
        console.error('Error updating device status:', updateError);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create position');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Add Label Position</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Position ID *
            </label>
            <input
              type="text"
              required
              value={formData.position_id}
              onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="A1-001"
            />
            <p className="text-xs text-slate-500 mt-1">
              Custom identifier for this position (editable)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Hardware Device *
            </label>
            <select
              required
              value={formData.hardware_device_id}
              onChange={(e) => setFormData({ ...formData, hardware_device_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select a device</option>
              {availableDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.device_id} ({device.device_type})
                </option>
              ))}
            </select>
            {availableDevices.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No available hardware devices. Please add devices to your inventory first.
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Physical device to assign to this position
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Placement Group *
            </label>
            <select
              required
              value={formData.placement_group}
              onChange={(e) => setFormData({ ...formData, placement_group: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select a placement group</option>
              {placementGroups.map((group) => (
                <option key={group.id} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
            {placementGroups.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No placement groups available. Please create placement groups first.
              </p>
            )}
          </div>

          {formData.hardware_device_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Selected Device</p>
              </div>
              <p className="text-sm text-blue-700">
                Device: <span className="font-mono font-semibold">
                  {availableDevices.find(d => d.id === formData.hardware_device_id)?.device_id}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || availableDevices.length === 0}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Position
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
