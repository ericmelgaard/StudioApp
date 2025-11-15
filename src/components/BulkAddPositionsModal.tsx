import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { X, Plus, AlertCircle, Cpu, Download, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HardwareDevice } from '../types/labels';

interface BulkAddPositionsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ParsedRow {
  row: number;
  position_id: string;
  product_name: string;
  product_sku: string;
  price: string;
  location: string;
  hardware_device_id: string;
  status: string;
  errors: ValidationError[];
  isValid: boolean;
}

export default function BulkAddPositionsModal({ onClose, onSuccess }: BulkAddPositionsModalProps) {
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'sequential'>('spreadsheet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<HardwareDevice[]>([]);
  const [placementGroups, setPlacementGroups] = useState<Array<{ id: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importOnlyValid, setImportOnlyValid] = useState(false);
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

  const downloadTemplate = () => {
    const headers = ['position_id', 'product_name', 'product_sku', 'price', 'location', 'hardware_device_id', 'status'];
    const exampleRow = ['A1-001', 'Example Product', 'SKU-001', '9.99', placementGroups[0]?.name || 'Aisle 1', '', 'unassigned'];

    const csv = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-positions-template-${Date.now()}.csv`;
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

      const { data: existingPositions } = await supabase
        .from('label_positions')
        .select('position_id');

      const existingIds = new Set(existingPositions?.map(p => p.position_id.toLowerCase()) || []);
      const placementGroupNames = new Set(placementGroups.map(g => g.name.toLowerCase()));

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: any = {};

        headers.forEach((header, idx) => {
          rowData[header] = values[idx] || '';
        });

        const errors: ValidationError[] = [];
        const rowNum = i + 1;

        if (!rowData.position_id) {
          errors.push({ row: rowNum, field: 'position_id', message: 'Position ID is required' });
        } else if (existingIds.has(rowData.position_id.toLowerCase())) {
          errors.push({ row: rowNum, field: 'position_id', message: 'Position ID already exists' });
        }

        if (!rowData.product_name) {
          errors.push({ row: rowNum, field: 'product_name', message: 'Product name is required' });
        }

        if (!rowData.price) {
          errors.push({ row: rowNum, field: 'price', message: 'Price is required' });
        } else if (isNaN(parseFloat(rowData.price))) {
          errors.push({ row: rowNum, field: 'price', message: 'Price must be a valid number' });
        } else if (parseFloat(rowData.price) < 0) {
          errors.push({ row: rowNum, field: 'price', message: 'Price must be non-negative' });
        }

        if (!rowData.location) {
          errors.push({ row: rowNum, field: 'location', message: 'Location is required' });
        } else if (!placementGroupNames.has(rowData.location.toLowerCase())) {
          errors.push({ row: rowNum, field: 'location', message: 'Placement group does not exist' });
        }

        rows.push({
          row: rowNum,
          position_id: rowData.position_id || '',
          product_name: rowData.product_name || '',
          product_sku: rowData.product_sku || '',
          price: rowData.price || '0',
          location: rowData.location || '',
          hardware_device_id: rowData.hardware_device_id || '',
          status: rowData.status || 'unassigned',
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

      const positions = rowsToImport.map(row => ({
        position_id: row.position_id,
        product_name: row.product_name,
        product_sku: row.product_sku || null,
        price: parseFloat(row.price),
        location: row.location,
        hardware_device_id: row.hardware_device_id || null,
        status: row.status || 'unassigned'
      }));

      const { error: insertError } = await supabase
        .from('label_positions')
        .insert(positions);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import positions');
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
    const headers = ['row', 'position_id', 'product_name', 'product_sku', 'price', 'location', 'hardware_device_id', 'status', 'errors'];

    const csv = [
      headers.join(','),
      ...errorRows.map(row => [
        row.row,
        row.position_id,
        row.product_name,
        row.product_sku,
        row.price,
        row.location,
        row.hardware_device_id,
        row.status,
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

  const previewCount = Math.min(parseInt(formData.count) || 0, availableDevices.length);
  const previewStart = parseInt(formData.start_number) || 1;
  const previewDevices = availableDevices.slice(0, Math.min(previewCount, 5));
  const previewPositionIds = previewDevices.map((device, idx) => {
    const num = previewStart + idx;
    return `${formData.prefix}${num.toString().padStart(3, '0')}`;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">Bulk Add Positions</h2>
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
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
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
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
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
                Download the CSV template with the correct format and fill it with your position data.
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
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Position ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Product Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Price</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Location</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.slice(0, 20).map((row) => (
                          <tr key={row.row} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                            <td className="px-3 py-2 text-xs text-slate-600">{row.row}</td>
                            <td className="px-3 py-2">
                              <span className="text-xs font-mono text-slate-900">{row.position_id}</span>
                              {row.errors.some(e => e.field === 'position_id') && (
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.find(e => e.field === 'position_id')?.message}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-slate-900">{row.product_name}</span>
                              {row.errors.some(e => e.field === 'product_name') && (
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.find(e => e.field === 'product_name')?.message}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-slate-900">${row.price}</span>
                              {row.errors.some(e => e.field === 'price') && (
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.find(e => e.field === 'price')?.message}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-slate-900">{row.location}</span>
                              {row.errors.some(e => e.field === 'location') && (
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.find(e => e.field === 'location')?.message}
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
                      className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
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
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {importOnlyValid ? validCount : parsedData.length} Positions
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
        )}
      </div>
    </div>
  );
}
