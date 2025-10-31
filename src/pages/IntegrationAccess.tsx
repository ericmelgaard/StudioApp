import { useState } from 'react';
import { Plus, Database, FileSpreadsheet, FileJson, Server, Calendar, Clock, Zap, Link, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface IntegrationSource {
  id: string;
  name: string;
  type: 'api' | 'spreadsheet' | 'json' | 'ftp';
  status: 'active' | 'inactive';
  syncFrequency: string;
  lastSync: string;
  endpoint?: string;
  schedule?: string;
}

const mockSources: IntegrationSource[] = [
  {
    id: '1',
    name: 'Qu POS API',
    type: 'api',
    status: 'active',
    syncFrequency: 'Every 15 minutes',
    lastSync: '2 minutes ago',
    endpoint: 'https://api.qu.com/v1',
    schedule: 'Every 15 min during business hours'
  }
];

const SOURCE_TYPES = [
  { value: 'api', label: 'REST API', icon: Database, color: 'blue' },
  { value: 'spreadsheet', label: 'Spreadsheet', icon: FileSpreadsheet, color: 'green' },
  { value: 'json', label: 'JSON File', icon: FileJson, color: 'purple' },
  { value: 'ftp', label: 'FTP Server', icon: Server, color: 'orange' }
];

const SYNC_FREQUENCIES = [
  { value: 'realtime', label: 'Real-time (Webhooks)' },
  { value: '5min', label: 'Every 5 minutes' },
  { value: '15min', label: 'Every 15 minutes' },
  { value: '30min', label: 'Every 30 minutes' },
  { value: '1hour', label: 'Every hour' },
  { value: '6hours', label: 'Every 6 hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'manual', label: 'Manual only' }
];

export default function IntegrationAccess() {
  const [sources] = useState<IntegrationSource[]>(mockSources);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('api');

  function getSourceIcon(type: string) {
    const sourceType = SOURCE_TYPES.find(t => t.value === type);
    return sourceType?.icon || Database;
  }

  function getSourceColor(type: string) {
    const sourceType = SOURCE_TYPES.find(t => t.value === type);
    return sourceType?.color || 'blue';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Integration Access</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Source
            </button>
          </div>
          <p className="text-slate-600">Configure data sources and sync schedules</p>
        </div>

        {/* Active Sources */}
        <div className="space-y-4">
          {sources.map(source => {
            const Icon = getSourceIcon(source.type);
            const color = getSourceColor(source.type);

            return (
              <div key={source.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 bg-${color}-100 rounded-lg`}>
                        <Icon className={`w-6 h-6 text-${color}-600`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{source.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Link className="w-4 h-4" />
                            {SOURCE_TYPES.find(t => t.value === source.type)?.label}
                          </span>
                          {source.endpoint && (
                            <span className="flex items-center gap-1">
                              <Server className="w-4 h-4" />
                              {source.endpoint}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {source.status === 'active' ? (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
                          <ToggleRight className="w-4 h-4" />
                          Active
                        </button>
                      ) : (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                          <ToggleLeft className="w-4 h-4" />
                          Inactive
                        </button>
                      )}
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Zap className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Sync Frequency</div>
                        <div className="text-sm font-medium text-slate-900">{source.syncFrequency}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Last Sync</div>
                        <div className="text-sm font-medium text-slate-900">{source.lastSync}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Schedule</div>
                        <div className="text-sm font-medium text-slate-900">{source.schedule}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">About Integration Access</h3>
          <p className="text-sm text-blue-800 mb-3">
            Configure how your system connects to external data sources. Each source can be configured with different sync frequencies and schedules to optimize performance and data freshness.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>Supported Sources:</strong>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>REST APIs with authentication</li>
                <li>Excel/CSV spreadsheets</li>
                <li>JSON data files</li>
                <li>FTP/SFTP servers</li>
              </ul>
            </div>
            <div>
              <strong>Sync Options:</strong>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>Real-time webhooks</li>
                <li>Scheduled polling (5min - daily)</li>
                <li>Manual sync on-demand</li>
                <li>Business hours scheduling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Add Integration Source</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Source Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Source Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCE_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isSelected
                            ? `border-${type.color}-500 bg-${type.color}-50`
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${isSelected ? `text-${type.color}-600` : 'text-slate-400'}`} />
                        <div className={`font-medium ${isSelected ? `text-${type.color}-900` : 'text-slate-700'}`}>
                          {type.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuration based on type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Source Name</label>
                <input
                  type="text"
                  placeholder="e.g., Production POS System"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {selectedType === 'api' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">API Endpoint</label>
                    <input
                      type="url"
                      placeholder="https://api.example.com/v1"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {selectedType === 'ftp' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Server Address</label>
                      <input
                        type="text"
                        placeholder="ftp.example.com"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
                      <input
                        type="number"
                        placeholder="21"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">File Path</label>
                    <input
                      type="text"
                      placeholder="/data/products.csv"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {(selectedType === 'spreadsheet' || selectedType === 'json') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">File Upload</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer">
                    <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedType === 'spreadsheet' ? 'CSV, XLSX, XLS files' : 'JSON files'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sync Frequency</label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {SYNC_FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                <label htmlFor="active" className="text-sm text-slate-700">Activate immediately after creation</label>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Create Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
