import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { X, Plus, AlertCircle, Monitor, Download, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LocationState } from '../hooks/useLocation';

interface BulkAddDisplaysModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableMediaPlayers: MediaPlayer[];
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
  media_player_id: string;
  display_type_id: string;
  position: string;
  errors: ValidationError[];
  isValid: boolean;
}

interface MediaPlayer {
  id: string;
  name: string;
  device_id: string;
  display_count?: number;
}

interface DisplayType {
  id: string;
  name: string;
  category: string;
}

export default function BulkAddDisplaysModal({ onClose, onSuccess, availableMediaPlayers, currentLocation }: BulkAddDisplaysModalProps) {
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'sequential'>('spreadsheet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importOnlyValid, setImportOnlyValid] = useState(false);
  const [formData, setFormData] = useState({
    prefix: 'Display-',
    start_number: '1',
    count: '5',
    media_player_id: '',
    display_type_id: '',
    start_position: '1',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const typesRes = await supabase.from('display_types').select('*').eq('status', 'active').order('name');
    if (typesRes.data) setDisplayTypes(typesRes.data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const count = parseInt(formData.count);

      if (count > 50) {
        throw new Error('Maximum 50 displays can be created at once');
      }

      if (!formData.media_player_id) {
        throw new Error('Please select a media player');
      }

      const selectedPlayer = availableMediaPlayers.find(p => p.id === formData.media_player_id);
      if (!selectedPlayer) {
        throw new Error('Selected media player not found');
      }

      if ((selectedPlayer.display_count || 0) + count > 2) {
        throw new Error(`This media player already has ${selectedPlayer.display_count} display(s). Each media player can have a maximum of 2 displays.`);
      }

      const { data: existingDisplays } = await supabase
        .from('displays')
        .select('position')
        .eq('media_player_id', formData.media_player_id);

      const occupiedPositions = new Set(existingDisplays?.map(d => d.position) || []);

      const startNum = parseInt(formData.start_number);
      const displays = [];

      let currentPosition = parseInt(formData.start_position);
      for (let i = 0; i < count; i++) {
        while (occupiedPositions.has(currentPosition) && currentPosition <= 2) {
          currentPosition++;
        }

        if (currentPosition > 2) {
          throw new Error(`Not enough available positions on this media player. Only ${2 - (selectedPlayer.display_count || 0)} position(s) available.`);
        }

        const num = startNum + i;
        const displayName = `${formData.prefix}${num.toString().padStart(3, '0')}`;

        displays.push({
          name: displayName,
          media_player_id: formData.media_player_id,
          display_type_id: formData.display_type_id || null,
          position: currentPosition,
          status: 'active'
        });

        currentPosition++;
      }

      const { error: insertError } = await supabase
        .from('displays')
        .insert(displays);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create displays');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'media_player_id', 'display_type_id', 'position'];
    const exampleRow = ['Front Display', availableMediaPlayers[0]?.id || '', displayTypes[0]?.id || '', '1'];

    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `displays-template-${Date.now()}.csv`;
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

      const { data: existingDisplays } = await supabase
        .from('displays')
        .select('name, media_player_id, position');

      const mediaPlayerIds = new Set(availableMediaPlayers.map(p => p.id));
      const displayTypeIds = new Set(displayTypes.map(t => t.id));

      const positionsByPlayer = existingDisplays?.reduce((acc, display) => {
        if (!acc[display.media_player_id]) {
          acc[display.media_player_id] = new Set();
        }
        acc[display.media_player_id].add(display.position);
        return acc;
      }, {} as Record<string, Set<number>>) || {};

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
        } else if (rowData.media_player_id) {
          const duplicateInPlayer = existingDisplays?.find(
            d => d.name.toLowerCase() === rowData.name.toLowerCase() &&
                 d.media_player_id === rowData.media_player_id
          );
          if (duplicateInPlayer) {
            errors.push({ row: rowNum, field: 'name', message: 'Display name already exists on this media player' });
          }
        }

        if (!rowData.media_player_id) {
          errors.push({ row: rowNum, field: 'media_player_id', message: 'Media player ID is required' });
        } else if (!mediaPlayerIds.has(rowData.media_player_id)) {
          errors.push({ row: rowNum, field: 'media_player_id', message: 'Media player ID does not exist' });
        }

        if (rowData.display_type_id && !displayTypeIds.has(rowData.display_type_id)) {
          errors.push({ row: rowNum, field: 'display_type_id', message: 'Display type ID does not exist' });
        }

        if (!rowData.position) {
          errors.push({ row: rowNum, field: 'position', message: 'Position is required' });
        } else {
          const position = parseInt(rowData.position);
          if (isNaN(position) || position < 1 || position > 2) {
            errors.push({ row: rowNum, field: 'position', message: 'Position must be 1 or 2' });
          } else if (rowData.media_player_id && positionsByPlayer[rowData.media_player_id]?.has(position)) {
            errors.push({ row: rowNum, field: 'position', message: `Position ${position} is already occupied on this media player` });
          }
        }

        const player = availableMediaPlayers.find(p => p.id === rowData.media_player_id);
        if (player && (player.display_count || 0) >= 2) {
          errors.push({ row: rowNum, field: 'media_player_id', message: 'Media player already has 2 displays (maximum)' });
        }

        rows.push({
          row: rowNum,
          name: rowData.name || '',
          media_player_id: rowData.media_player_id || '',
          display_type_id: rowData.display_type_id || '',
          position: rowData.position || '',
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

      const displays = rowsToImport.map(row => ({
        name: row.name,
        media_player_id: row.media_player_id,
        display_type_id: row.display_type_id || null,
        position: parseInt(row.position),
        status: 'active'
      }));

      const { error: insertError } = await supabase
        .from('displays')
        .insert(displays);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import displays');
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
    const headers = ['row', 'name', 'media_player_id', 'display_type_id', 'position', 'errors'];

    const csv = [
      headers.join(','),
      ...errorRows.map(row => [
        row.row,
        row.name,
        row.media_player_id,
        row.display_type_id,
        row.position,
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
  const selectedPlayer = availableMediaPlayers.find(p => p.id === formData.media_player_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">Bulk Add Displays</h2>
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
                Download the CSV template with the correct format and fill it with your display data.
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
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Position</th>
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
                              <span className="text-xs text-slate-900">{row.position}</span>
                              {row.errors.some(e => e.field === 'position') && (
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.find(e => e.field === 'position')?.message}
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
                    Import {importOnlyValid ? validCount : parsedData.length} Displays
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
              <h3 className="font-medium text-blue-900 mb-3">Display Name Generation</h3>
              <p className="text-sm text-blue-700 mb-3">
                Displays will be created with sequential names.
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
                    placeholder="Display-"
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
                    max="50"
                    value={formData.count}
                    onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Media Player *
              </label>
              <select
                required
                value={formData.media_player_id}
                onChange={(e) => setFormData({ ...formData, media_player_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a media player</option>
                {availableMediaPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.display_count || 0}/2 displays)
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {currentLocation.store
                  ? `Displays will be added to a media player at ${currentLocation.store.name}`
                  : 'Each media player can have up to 2 displays'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Type (Optional)
              </label>
              <select
                value={formData.display_type_id}
                onChange={(e) => setFormData({ ...formData, display_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No display type (set later)</option>
                {displayTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Position *
              </label>
              <select
                required
                value={formData.start_position}
                onChange={(e) => setFormData({ ...formData, start_position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1">Position 1</option>
                <option value="2">Position 2</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Position to start from (for dual-display setups)
              </p>
            </div>

            {previewCount > 0 && formData.prefix && formData.media_player_id && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-900 mb-3">
                  Preview - First {previewCount} displays on {selectedPlayer?.name}:
                </p>
                <div className="space-y-2">
                  {Array.from({ length: previewCount }).map((_, idx) => {
                    const num = previewStart + idx;
                    const displayName = `${formData.prefix}${num.toString().padStart(3, '0')}`;
                    const position = parseInt(formData.start_position) + idx;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200"
                      >
                        <Monitor className="w-4 h-4 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{displayName}</p>
                          <p className="text-xs text-slate-600">Position {position}</p>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Active</span>
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

            {selectedPlayer && (selectedPlayer.display_count || 0) >= 2 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Media player at capacity</p>
                    <p className="text-sm text-amber-700 mt-1">
                      This media player already has 2 displays. Please select a different media player.
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
                disabled={loading || !formData.media_player_id || (selectedPlayer && (selectedPlayer.display_count || 0) >= 2)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating {formData.count} displays...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create {formData.count} Displays
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
