import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { X, Plus, AlertCircle, Monitor, Download, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LocationState } from '../hooks/useLocation';

interface BulkAddMediaPlayersModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableStores: Store[];
  currentLocation: LocationState;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ParsedRow {
  row: number;
  name: string;
  hardware_device_id: string;
  store_id: string;
  placement_group_id: string;
  ip_address: string;
  firmware_version: string;
  errors: ValidationError[];
  isValid: boolean;
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

export default function BulkAddMediaPlayersModal({ onClose, onSuccess, availableStores, currentLocation }: BulkAddMediaPlayersModalProps) {
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'sequential'>('spreadsheet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<HardwareDevice[]>([]);
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
  const [filteredPlacementGroups, setFilteredPlacementGroups] = useState<PlacementGroup[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importOnlyValid, setImportOnlyValid] = useState(false);
  const [formData, setFormData] = useState({
    prefix: 'MP-',
    start_number: '1',
    count: '10',
    store_id: currentLocation.store ? currentLocation.store.id.toString() : '',
    placement_group_id: '',
    auto_assign_hardware: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.store_id) {
      const filtered = placementGroups.filter(g => g.store_id === parseInt(formData.store_id));
      setFilteredPlacementGroups(filtered);
      if (!filtered.find(g => g.id === formData.placement_group_id)) {
        setFormData(prev => ({ ...prev, placement_group_id: '' }));
      }
    } else {
      setFilteredPlacementGroups([]);
      setFormData(prev => ({ ...prev, placement_group_id: '' }));
    }
  }, [formData.store_id, placementGroups]);

  const loadData = async () => {
    const [devicesRes, groupsRes] = await Promise.all([
      supabase.from('hardware_devices').select('*').eq('status', 'available').order('device_id'),
      supabase.from('placement_groups').select('id, name, store_id').order('name')
    ]);

    if (devicesRes.data) setAvailableDevices(devicesRes.data);
    if (groupsRes.data) setPlacementGroups(groupsRes.data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const count = parseInt(formData.count);

      if (count > 100) {
        throw new Error('Maximum 100 media players can be created at once');
      }

      if (!formData.store_id) {
        throw new Error('Store is required for all media players');
      }

      if (formData.auto_assign_hardware && count > availableDevices.length) {
        throw new Error(`Only ${availableDevices.length} hardware devices available. Cannot create ${count} media players with auto-assign enabled.`);
      }

      const startNum = parseInt(formData.start_number);
      const mediaPlayers = [];

      for (let i = 0; i < count; i++) {
        const num = startNum + i;
        const deviceId = `${formData.prefix}${num.toString().padStart(3, '0')}`;

        const player: any = {
          device_id: deviceId,
          name: `Media Player ${deviceId}`,
          store_id: parseInt(formData.store_id),
          placement_group_id: formData.placement_group_id || null,
          status: 'offline',
        };

        if (formData.auto_assign_hardware && availableDevices[i]) {
          player.hardware_device_id = availableDevices[i].id;
        }

        mediaPlayers.push(player);
      }

      const { error: insertError } = await supabase
        .from('media_players')
        .insert(mediaPlayers);

      if (insertError) throw insertError;

      if (formData.auto_assign_hardware) {
        const deviceIds = availableDevices.slice(0, count).map(d => d.id);
        await supabase
          .from('hardware_devices')
          .update({ status: 'assigned' })
          .in('id', deviceIds);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create media players');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'store_id', 'hardware_device_id', 'placement_group_id', 'ip_address', 'firmware_version'];
    const exampleRow = ['Front Counter Display', availableStores[0]?.id || 'REQUIRED', '', placementGroups[0]?.id || '', '192.168.1.100', 'v1.0.0'];

    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media-players-template-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError(null);
    await parseFile(file);
  };

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('File must contain at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows: ParsedRow[] = [];

      const { data: existingPlayers } = await supabase
        .from('media_players')
        .select('device_id, name, store_id');

      const existingDeviceIds = new Set(existingPlayers?.map(p => p.device_id.toLowerCase()) || []);
      const storeIds = new Set(availableStores.map(s => s.id.toString()));
      const placementGroupsByStore = placementGroups.reduce((acc, g) => {
        if (!acc[g.store_id]) acc[g.store_id] = [];
        acc[g.store_id].push(g.id);
        return acc;
      }, {} as Record<number, string[]>);

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: any = {};

        headers.forEach((header, idx) => {
          rowData[header] = values[idx] || '';
        });

        const errors: ValidationError[] = [];
        const rowNum = i + 1;

        if (!rowData.name) {
          errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
        }

        if (!rowData.store_id) {
          errors.push({ row: rowNum, field: 'store_id', message: 'Store ID is required' });
        } else if (!storeIds.has(rowData.store_id)) {
          errors.push({ row: rowNum, field: 'store_id', message: 'Store ID does not exist' });
        } else if (rowData.name) {
          const duplicateInStore = existingPlayers?.find(
            p => p.name.toLowerCase() === rowData.name.toLowerCase() &&
                 p.store_id.toString() === rowData.store_id
          );
          if (duplicateInStore) {
            errors.push({ row: rowNum, field: 'name', message: 'Name already exists in this store' });
          }
        }

        if (rowData.placement_group_id && rowData.store_id) {
          const storeId = parseInt(rowData.store_id);
          const storeGroups = placementGroupsByStore[storeId] || [];
          if (!storeGroups.includes(rowData.placement_group_id)) {
            errors.push({ row: rowNum, field: 'placement_group_id', message: 'Placement group does not belong to the selected store' });
          }
        }

        rows.push({
          row: rowNum,
          name: rowData.name || '',
          hardware_device_id: rowData.hardware_device_id || '',
          store_id: rowData.store_id || '',
          placement_group_id: rowData.placement_group_id || '',
          ip_address: rowData.ip_address || '',
          firmware_version: rowData.firmware_version || '',
          errors,
          isValid: errors.length === 0
        });
      }

      setParsedData(rows);
    } catch (err) {
      setError('Failed to parse file. Please ensure it is a valid CSV file.');
      console.error('Parse error:', err);
    }
  };

  const handleImportFromSpreadsheet = async () => {
    setImporting(true);
    setError(null);

    try {
      const rowsToImport = importOnlyValid
        ? parsedData.filter(row => row.isValid)
        : parsedData;

      if (rowsToImport.length === 0) {
        throw new Error('No valid rows to import');
      }

      const mediaPlayers = rowsToImport.map(row => ({
        device_id: `MP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: row.name,
        hardware_device_id: row.hardware_device_id || null,
        store_id: parseInt(row.store_id),
        placement_group_id: row.placement_group_id || null,
        ip_address: row.ip_address || null,
        firmware_version: row.firmware_version || null,
        status: 'offline'
      }));

      const { error: insertError } = await supabase
        .from('media_players')
        .insert(mediaPlayers);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import media players');
    } finally {
      setImporting(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setParsedData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadErrorReport = () => {
    const errorRows = parsedData.filter(row => !row.isValid);
    const headers = ['row', 'name', 'hardware_device_id', 'store_id', 'placement_group_id', 'ip_address', 'firmware_version', 'errors'];

    const csv = [
      headers.join(','),
      ...errorRows.map(row => [
        row.row,
        row.name,
        row.hardware_device_id,
        row.store_id,
        row.placement_group_id,
        row.ip_address,
        row.firmware_version,
        row.errors.map(e => `${e.field}: ${e.message}`).join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter(row => row.isValid).length;
  const errorCount = parsedData.filter(row => !row.isValid).length;

  const previewCount = Math.min(parseInt(formData.count) || 0, 5);
  const previewStart = parseInt(formData.start_number) || 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">Bulk Add Media Players</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="border-b border-slate-200 sticky top-[73px] bg-white z-10">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('spreadsheet')}
              className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'spreadsheet'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Import from Spreadsheet
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sequential')}
              className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'sequential'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Generate Sequential
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'spreadsheet' ? (
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Step 1: Download Template
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Download the CSV template with the correct format and fill it with your media player data.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Step 2: Upload Completed Spreadsheet
              </h3>
              <p className="text-sm text-green-700 mb-3">
                Upload your completed CSV file. The file will be validated automatically.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!uploadedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-green-300 rounded-lg p-6 hover:border-green-400 hover:bg-green-100/50 transition-colors flex flex-col items-center gap-2 text-green-700"
                >
                  <Upload className="w-8 h-8" />
                  <span className="font-medium">Click to upload CSV file</span>
                  <span className="text-xs">or drag and drop</span>
                </button>
              ) : (
                <div className="bg-white border border-green-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {parsedData.length > 0 && (
              <>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-4">
                    <h3 className="font-medium text-slate-900 mb-2">Validation Results</h3>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-slate-700">{validCount} Valid</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-slate-700">{errorCount} Errors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600" />
                        <span className="text-slate-700">{parsedData.length} Total</span>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Store</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.slice(0, 20).map((row) => (
                          <tr key={row.row} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                            <td className="px-3 py-2 text-xs text-slate-600">{row.row}</td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-slate-900">{row.name}</span>
                              {row.errors.some(e => e.field === 'name') && (
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.find(e => e.field === 'name')?.message}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-slate-900">{row.store_id || 'N/A'}</span>
                              {row.errors.some(e => e.field === 'store_id') && (
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.find(e => e.field === 'store_id')?.message}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.isValid ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 20 && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-600">
                        Showing first 20 of {parsedData.length} rows
                      </div>
                    )}
                  </div>
                </div>

                {errorCount > 0 && (
                  <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">{errorCount} rows have errors</p>
                        <p className="text-xs text-amber-700">Download the error report to fix issues</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={downloadErrorReport}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Error Report
                    </button>
                  </div>
                )}

                {errorCount > 0 && validCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={importOnlyValid}
                      onChange={(e) => setImportOnlyValid(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-900">
                      Import only valid rows ({validCount} rows) and skip errors
                    </span>
                  </label>
                )}
              </>
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
                type="button"
                onClick={handleImportFromSpreadsheet}
                disabled={importing || parsedData.length === 0 || (errorCount > 0 && !importOnlyValid) || (importOnlyValid && validCount === 0)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {importOnlyValid ? validCount : parsedData.length} Media Players
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Device ID Generation</h3>
              <p className="text-sm text-blue-700 mb-3">
                Media players will be created with sequential device IDs.
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
                    placeholder="MP-"
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
                Store *
              </label>
              <select
                required
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                disabled={!!currentLocation.store}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a store</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {currentLocation.store
                  ? 'Store is set based on your current location'
                  : 'Media players are unique to each store'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Placement Group (Optional)
              </label>
              <select
                value={formData.placement_group_id}
                onChange={(e) => setFormData({ ...formData, placement_group_id: e.target.value })}
                disabled={!formData.store_id}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">No placement group</option>
                {filteredPlacementGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {!formData.store_id && (
                <p className="text-xs text-slate-500 mt-1">
                  Select a store first to see available placement groups
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
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-900">Auto-assign hardware devices</span>
                </label>
                {formData.auto_assign_hardware && (
                  <div className="ml-6 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Monitor className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-700">
                      {availableDevices.length} devices available
                    </span>
                  </div>
                )}
              </div>
            </div>

            {previewCount > 0 && formData.prefix && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-900 mb-3">
                  Preview - First {previewCount} media players will be created:
                </p>
                <div className="space-y-2">
                  {Array.from({ length: previewCount }).map((_, idx) => {
                    const num = previewStart + idx;
                    const deviceId = `${formData.prefix}${num.toString().padStart(3, '0')}`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-mono font-medium text-slate-900">{deviceId}</p>
                          <p className="text-xs text-slate-600 mt-1">Media Player {deviceId}</p>
                        </div>
                        <span className="text-xs text-slate-600 font-medium">Offline</span>
                      </div>
                    );
                  })}
                  {parseInt(formData.count) > 5 && (
                    <p className="text-xs text-slate-500 text-center py-2">
                      ... and {parseInt(formData.count) - 5} more
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
                      Please add hardware devices to your inventory or disable auto-assign.
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating {formData.count} media players...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create {formData.count} Media Players
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
