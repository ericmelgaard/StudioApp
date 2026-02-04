import { useState, useEffect, useRef } from 'react';
import { X, Search, Tag, ChevronRight, Nfc } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MobileShelfLabelsViewProps {
  onClose: () => void;
  storeId: number;
}

interface ShelfLabel {
  id: number;
  name: string;
  device_id: string;
  status: 'online' | 'offline';
  hardware_device_id: string | null;
  hardware_device?: {
    serial_number: string;
    battery_status: string;
    signal_strength: string;
    label_type: string;
  };
}

export default function MobileShelfLabelsView({ onClose, storeId }: MobileShelfLabelsViewProps) {
  const [labels, setLabels] = useState<ShelfLabel[]>([]);
  const [filteredLabels, setFilteredLabels] = useState<ShelfLabel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLabels();
    checkNFCSupport();
  }, [storeId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLabels(labels);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredLabels(
        labels.filter(
          (label) =>
            label.name.toLowerCase().includes(query) ||
            label.device_id.toLowerCase().includes(query) ||
            label.hardware_device?.serial_number?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, labels]);

  const checkNFCSupport = () => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  };

  const loadLabels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_players')
        .select(`
          id,
          name,
          device_id,
          status,
          hardware_device_id,
          hardware_devices!media_players_hardware_device_serial_fkey (
            serial_number,
            battery_status,
            signal_strength,
            label_type
          )
        `)
        .eq('store_id', storeId)
        .eq('player_type', 'label')
        .order('name');

      if (error) throw error;

      const formattedLabels = (data || []).map(label => ({
        id: label.id,
        name: label.name,
        device_id: label.device_id,
        status: label.status as 'online' | 'offline',
        hardware_device_id: label.hardware_device_id,
        hardware_device: Array.isArray(label.hardware_devices)
          ? label.hardware_devices[0]
          : label.hardware_devices
      }));

      setLabels(formattedLabels);
      setFilteredLabels(formattedLabels);
    } catch (error) {
      console.error('Error loading shelf labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNFCScan = async () => {
    if (!nfcSupported || !('NDEFReader' in window)) {
      alert('NFC is not supported on this device');
      return;
    }

    try {
      setNfcScanning(true);
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        setSearchQuery(serialNumber);
        setNfcScanning(false);
      });
    } catch (error) {
      console.error('NFC scan failed:', error);
      alert('Unable to start NFC scan. Please check permissions.');
      setNfcScanning(false);
    }
  };

  const handleLabelClick = (label: ShelfLabel) => {
    console.log('Selected label:', label);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[300] flex flex-col">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-white" />
          <h1 className="text-xl font-bold text-white">Smart Labels</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or serial number..."
            className="w-full pl-10 pr-20 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
          />
          {nfcSupported && (
            <button
              onClick={handleNFCScan}
              disabled={nfcScanning}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors touch-manipulation ${
                nfcScanning
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
              }`}
              title="Tap NFC tag"
            >
              <Nfc className={`w-5 h-5 ${nfcScanning ? 'animate-pulse' : ''}`} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            {filteredLabels.length} {filteredLabels.length === 1 ? 'device' : 'devices'}
          </span>
          {nfcScanning && (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              Waiting for NFC tap...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredLabels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Tag className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 text-center">
              {searchQuery ? 'No labels match your search' : 'No shelf labels found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredLabels.map((label) => (
              <button
                key={label.id}
                onClick={() => handleLabelClick(label)}
                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 active:bg-slate-100 dark:active:bg-slate-700 transition-colors touch-manipulation text-left"
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    label.status === 'online'
                      ? 'bg-green-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                    {label.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {label.hardware_device?.serial_number || 'No hardware assigned'}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
