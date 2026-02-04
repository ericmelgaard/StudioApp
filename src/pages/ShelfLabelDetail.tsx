import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Radio,
  Zap,
  CheckCircle2,
  MapPin,
  Calendar,
  Monitor,
  Wifi,
  Battery,
  RefreshCw,
  Tag,
  Package
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

interface HardwareDevice {
  id: string;
  device_id: string;
  device_type: string;
  serial_number: string;
  mac_address: string | null;
  signal_strength: string | null;
  battery_status: string | null;
  sync_status: string | null;
  last_seen: string | null;
  activation_id: string;
  client_version: string;
  activated_at: string;
  status: string;
  notes: string | null;
}

interface MediaPlayer {
  id: string;
  name: string;
  device_id: string;
  status: string;
  player_type: string;
  store_id: string;
  hardware_devices: HardwareDevice[];
}

interface ShelfLabelDetailProps {
  deviceId: string;
  onBack: () => void;
}

export default function ShelfLabelDetail({ deviceId, onBack }: ShelfLabelDetailProps) {
  const [device, setDevice] = useState<MediaPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  const loadDevice = async () => {
    if (!deviceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('media_players')
        .select(`
          *,
          hardware_devices!media_players_hardware_device_serial_fkey(*)
        `)
        .eq('id', deviceId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDevice(data);
        await generatePreview(data);
      }
    } catch (error) {
      console.error('Error loading device:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async (deviceData: MediaPlayer) => {
    // For now, create a canvas-based preview
    // In a real implementation, this would fetch/generate the actual label content
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // White text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    // Product name (use device name as placeholder)
    ctx.font = 'bold 28px Arial';
    ctx.fillText(deviceData.name || 'Product Name', canvas.width / 2, 60);

    // Description
    ctx.font = '18px Arial';
    ctx.fillText('Product description', canvas.width / 2, 100);
    ctx.fillText('and details', canvas.width / 2, 130);

    // Checkmark in corner (simulate icon)
    ctx.beginPath();
    ctx.arc(350, 240, 20, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(340, 240);
    ctx.lineTo(347, 247);
    ctx.lineTo(360, 233);
    ctx.stroke();

    const imageUrl = canvas.toDataURL();
    setPreviewImage(imageUrl);
  };

  const getSignalColor = (strength: string | null) => {
    if (!strength) return 'text-slate-400';
    switch (strength) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-green-500';
      case 'FAIR': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getBatteryColor = (status: string | null) => {
    if (!status) return 'text-slate-400';
    switch (status) {
      case 'GOOD': return 'text-green-600';
      case 'LOW': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getSyncColor = (status: string | null) => {
    return status === 'SUCCESS' ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Monitor className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Device not found</p>
          <button
            onClick={() => onBack()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hardware = device.hardware_devices?.[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => onBack()}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {device.name}
              </h1>
              <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
                {hardware?.serial_number || device.device_id}
              </p>
            </div>
          </div>
          <Breadcrumb items={[
            { label: 'Devices' },
            { label: device.name }
          ]} />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Label Preview */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Current Display
            </h2>
          </div>
          <div className="p-4 flex justify-center bg-slate-100 dark:bg-slate-900">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Label preview"
                className="max-w-full h-auto rounded shadow-lg"
              />
            ) : (
              <div className="w-full aspect-[4/3] bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                <p className="text-slate-400">No preview available</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Overview */}
        {hardware && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Signal Strength */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Radio className={`w-5 h-5 ${getSignalColor(hardware.signal_strength)}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">Signal</span>
              </div>
              <p className={`text-lg font-semibold ${getSignalColor(hardware.signal_strength)}`}>
                {hardware.signal_strength || 'Unknown'}
              </p>
            </div>

            {/* Battery Status */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className={`w-5 h-5 ${getBatteryColor(hardware.battery_status)}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">Battery</span>
              </div>
              <p className={`text-lg font-semibold ${getBatteryColor(hardware.battery_status)}`}>
                {hardware.battery_status || 'Unknown'}
              </p>
            </div>

            {/* Sync Status */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className={`w-5 h-5 ${getSyncColor(hardware.sync_status)}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">Sync</span>
              </div>
              <p className={`text-lg font-semibold ${getSyncColor(hardware.sync_status)}`}>
                {hardware.sync_status === 'SUCCESS' ? 'Synced' : 'Failed'}
              </p>
            </div>

            {/* Status */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Status</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {hardware.status}
              </p>
            </div>
          </div>
        )}

        {/* Device Information */}
        {hardware && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Device Information
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Serial Number</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{hardware.serial_number}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Device Type</span>
                <span className="text-slate-900 dark:text-slate-100">{hardware.device_type}</span>
              </div>
              {hardware.mac_address && (
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">MAC Address</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{hardware.mac_address}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Client Version</span>
                <span className="text-slate-900 dark:text-slate-100">{hardware.client_version}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Activated</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {new Date(hardware.activated_at).toLocaleDateString()}
                </span>
              </div>
              {hardware.last_seen && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-600 dark:text-slate-400">Last Seen</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {new Date(hardware.last_seen).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Zap className="w-5 h-5" />
            Blink
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-5 h-5" />
            Force Sync
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
            <Tag className="w-5 h-5" />
            Update Content
          </button>
        </div>
      </div>
    </div>
  );
}
