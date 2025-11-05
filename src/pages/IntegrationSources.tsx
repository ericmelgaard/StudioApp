import { useState, useEffect } from 'react';
import { Plus, Database, Edit2, Trash2, ToggleLeft, ToggleRight, Server, Calendar, Clock, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IntegrationSourcesProps {
  onBack: () => void;
}

interface IntegrationSource {
  id: string;
  name: string;
  type: string;
  status: string;
  config: {
    endpoint?: string;
    source_location?: string;
    sync_frequency?: string;
    schedule?: string;
  };
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

const SOURCE_TYPES = [
  { value: 'api', label: 'REST API' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'ftp', label: 'FTP Server' },
  { value: 'database', label: 'Database' }
];

export default function IntegrationSources({ onBack }: IntegrationSourcesProps) {
  const [sources, setSources] = useState<IntegrationSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<IntegrationSource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('integration_sources')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading integration sources:', error);
    } else if (data) {
      setSources(data);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (source: IntegrationSource) => {
    const newStatus = source.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('integration_sources')
      .update({ status: newStatus })
      .eq('id', source.id);

    if (!error) {
      loadSources();
    }
  };

  const handleDelete = async (source: IntegrationSource) => {
    if (!confirm(`Are you sure you want to delete "${source.name}"? This will also delete all associated integration products.`)) {
      return;
    }

    const { error } = await supabase
      .from('integration_sources')
      .delete()
      .eq('id', source.id);

    if (!error) {
      loadSources();
    }
  };

  const filteredSources = sources.filter(source =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSync = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Integration Sources</h1>
          <p className="text-slate-600">
            Manage external data sources and their configurations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Source
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search sources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No integration sources found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSources.map(source => (
            <div key={source.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{source.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Server className="w-4 h-4" />
                        {SOURCE_TYPES.find(t => t.value === source.type)?.label || source.type}
                      </span>
                      {source.config?.endpoint && (
                        <span className="text-slate-400">{source.config.endpoint}</span>
                      )}
                    </div>
                    {source.config?.source_location && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                        Location: {source.config.source_location}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(source)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      source.status === 'active'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {source.status === 'active' ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        Active
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        Inactive
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSource(source);
                      setShowEditModal(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(source)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Sync Frequency</div>
                    <div className="text-sm font-medium text-slate-900">
                      {source.config?.sync_frequency || 'Not configured'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Last Sync</div>
                    <div className="text-sm font-medium text-slate-900">
                      {source.last_sync_at ? formatLastSync(source.last_sync_at) : 'Never'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Database className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Schedule</div>
                    <div className="text-sm font-medium text-slate-900">
                      {source.config?.schedule || 'Manual'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">About Integration Sources</h3>
        <p className="text-sm text-blue-800 mb-3">
          Integration sources define external systems that provide product data to WAND. Each source can be configured with
          different connection details, sync frequencies, and schedules.
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Sources can be temporarily disabled without deleting configuration</li>
          <li>Deleting a source will remove all associated integration products</li>
          <li>Sync status shows the last successful data synchronization</li>
          <li>Location settings determine which external data to fetch</li>
        </ul>
      </div>

      {showAddModal && (
        <AddSourceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSources();
          }}
        />
      )}

      {showEditModal && selectedSource && (
        <EditSourceModal
          source={selectedSource}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSource(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedSource(null);
            loadSources();
          }}
        />
      )}
    </div>
  );
}

function AddSourceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'api',
    status: 'active',
    endpoint: '',
    source_location: '',
    sync_frequency: 'Every 15 minutes',
    schedule: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error: saveError } = await supabase
      .from('integration_sources')
      .insert({
        name: formData.name,
        type: formData.type,
        status: formData.status,
        config: {
          endpoint: formData.endpoint,
          source_location: formData.source_location,
          sync_frequency: formData.sync_frequency,
          schedule: formData.schedule
        }
      });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Add Integration Source</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Toast POS API"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SOURCE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">API Endpoint</label>
            <input
              type="url"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://api.example.com/v1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source Location</label>
            <input
              type="text"
              value={formData.source_location}
              onChange={(e) => setFormData({ ...formData, source_location: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 100020"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sync Frequency</label>
            <input
              type="text"
              value={formData.sync_frequency}
              onChange={(e) => setFormData({ ...formData, sync_frequency: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Every 15 minutes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Schedule</label>
            <input
              type="text"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Every 15 min during business hours"
            />
          </div>

          <div className="border-t border-slate-200 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditSourceModal({ source, onClose, onSuccess }: { source: IntegrationSource; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: source.name,
    type: source.type,
    status: source.status,
    endpoint: source.config?.endpoint || '',
    source_location: source.config?.source_location || '',
    sync_frequency: source.config?.sync_frequency || '',
    schedule: source.config?.schedule || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error: saveError } = await supabase
      .from('integration_sources')
      .update({
        name: formData.name,
        type: formData.type,
        status: formData.status,
        config: {
          endpoint: formData.endpoint,
          source_location: formData.source_location,
          sync_frequency: formData.sync_frequency,
          schedule: formData.schedule
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', source.id);

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Edit Integration Source</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SOURCE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">API Endpoint</label>
            <input
              type="url"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source Location</label>
            <input
              type="text"
              value={formData.source_location}
              onChange={(e) => setFormData({ ...formData, source_location: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sync Frequency</label>
            <input
              type="text"
              value={formData.sync_frequency}
              onChange={(e) => setFormData({ ...formData, sync_frequency: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Schedule</label>
            <input
              type="text"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border-t border-slate-200 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
