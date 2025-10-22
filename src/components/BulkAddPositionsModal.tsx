import { useState, useEffect, FormEvent } from 'react';
import { X, Plus, AlertCircle, Cpu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HardwareDevice } from '../types/labels';

interface BulkAddPositionsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkAddPositionsModal({ onClose, onSuccess }: BulkAddPositionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<HardwareDevice[]>([]);
  const [placementGroups, setPlacementGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    prefix: '',
    start_number: '1',
    count: '10',
    placement_group: '',
    auto_assign_hardware: true,
    device_size: 'all',
  });

  useEffect(() => {
    loadAvailableDevices();
    loadPlacementGroups();
  }, [formData.device_size]);

  const loadAvailableDevices = async () => {
    let query = supabase
      .from('hardware_devices')
      .select('*')
      .eq('status', 'available');

    if (formData.device_size !== 'all') {
      query = query.eq('device_type', formData.device_size);
    }

    const { data, error } = await query.order('device_id');

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
      const count = parseInt(formData.count);

      if (count > 100) {
        throw new Error('Maximum 100 positions can be created at once');
      }

      if (formData.auto_assign_hardware && count > availableDevices.length) {
        throw new Error(`Only ${availableDevices.length} hardware devices available. Cannot create ${count} positions with auto-assign enabled.`);
      }

      const startNum = parseInt(formData.start_number);

      const positions = [];
      for (let i = 0; i < count; i++) {
        const num = startNum + i;
        const positionId = `${formData.prefix}${num.toString().padStart(3, '0')}`;

        const position: any = {
          position_id: positionId,
          product_name: formData.auto_assign_hardware ? `${availableDevices[i].device_id} (${availableDevices[i].device_type})` : 'Unassigned',
          price: 0,
          location: formData.placement_group,
          status: formData.auto_assign_hardware ? 'pending' : 'unassigned',
        };

        if (formData.auto_assign_hardware) {
          position.hardware_device_id = availableDevices[i].id;
        }

        positions.push(position);
      }

      const { error: insertError } = await supabase
        .from('label_positions')
        .insert(positions);

      if (insertError) throw insertError;

      if (formData.auto_assign_hardware) {
        const deviceIds = availableDevices.slice(0, count).map(d => d.id);
        const { error: updateError } = await supabase
          .from('hardware_devices')
          .update({ status: 'assigned' })
          .in('id', deviceIds);

        if (updateError) {
          console.error('Error updating device status:', updateError);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create positions');
    } finally {
      setLoading(false);
    }
  };

  const previewCount = Math.min(parseInt(formData.count) || 0, availableDevices.length);
  const previewStart = parseInt(formData.start_number) || 1;
  const previewDevices = availableDevices.slice(0, Math.min(previewCount, 5));
  const previewPositionIds = previewDevices.map((device, idx) => {
    const num = previewStart + idx;
    return `${formData.prefix}${num.toString().padStart(3, '0')}`;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">Bulk Add Positions</h2>
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
            <h3 className="font-medium text-blue-900 mb-3">Position Name Generation</h3>
            <p className="text-sm text-blue-700 mb-3">
              Positions will be created with sequential names.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-blue-900 mb-2">
                  Prefix *
                </label>
                <input
                  type="text"
                  required
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="A1-"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-900 mb-2">
                  Start Number *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.start_number}
                  onChange={(e) => setFormData({ ...formData, start_number: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-900 mb-2">
                  Count *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Hardware Assignment
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_assign_hardware}
                  onChange={(e) => setFormData({ ...formData, auto_assign_hardware: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-slate-900">Auto-assign hardware devices</span>
              </label>
              {formData.auto_assign_hardware && (
                <div className="ml-6 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Device Size
                    </label>
                    <select
                      value={formData.device_size}
                      onChange={(e) => setFormData({ ...formData, device_size: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="all">All Sizes</option>
                      <option value='4.2"'>4.2&quot;</option>
                      <option value='5"'>5&quot;</option>
                      <option value='7"'>7&quot;</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Cpu className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-700">
                      {formData.device_size === 'all'
                        ? `${availableDevices.length} devices available (all sizes)`
                        : `${availableDevices.length} devices available (${formData.device_size})`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {previewCount > 0 && formData.prefix && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-900 mb-3">
                Preview - First {Math.min(previewCount, 5)} positions will be created:
              </p>
              <div className="space-y-2">
                {formData.auto_assign_hardware ? (
                  previewDevices.map((device, idx) => (
                    <div
                      key={device.id}
                      className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-mono font-medium text-slate-900">{previewPositionIds[idx]}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Cpu className="w-3 h-3 text-slate-400" />
                          <p className="text-xs text-slate-600">{device.device_id} ({device.device_type})</p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 font-medium">Ready</span>
                    </div>
                  ))
                ) : (
                  Array.from({ length: Math.min(previewCount, 5) }).map((_, idx) => {
                    const num = previewStart + idx;
                    const positionId = `${formData.prefix}${num.toString().padStart(3, '0')}`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-mono font-medium text-slate-900">{positionId}</p>
                          <p className="text-xs text-slate-500 mt-1">No hardware assigned</p>
                        </div>
                        <span className="text-xs text-slate-600 font-medium">Unassigned</span>
                      </div>
                    );
                  })
                )}
                {previewCount > 5 && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    ... and {previewCount - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {formData.auto_assign_hardware && availableDevices.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">No hardware devices available</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {formData.device_size === 'all'
                      ? 'Please add hardware devices to your inventory or disable auto-assign.'
                      : `No ${formData.device_size} devices available. Try selecting "All Sizes" or disable auto-assign.`}
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
              disabled={loading || (formData.auto_assign_hardware && availableDevices.length === 0)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating {formData.count} positions...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create {formData.count} Positions
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
