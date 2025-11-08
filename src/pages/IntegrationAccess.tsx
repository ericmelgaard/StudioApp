import { useState, useEffect } from 'react';
import { Plus, Database, FileSpreadsheet, FileJson, Server, Calendar, Clock, Zap, Link, Edit2, Trash2, ToggleLeft, ToggleRight, Send, ChevronDown, ChevronRight, MapPin, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AddWandIntegrationModal from '../components/AddWandIntegrationModal';
import EditWandIntegrationModal from '../components/EditWandIntegrationModal';
import LocationRequired from '../components/LocationRequired';
import { useLocation } from '../hooks/useLocation';

interface IntegrationSourceConfig {
  id: string;
  config_name: string;
  wand_source_id: string;
  application_level: 'concept' | 'company' | 'site';
  concept_id: number | null;
  company_id: number | null;
  site_id: number | null;
  config_params: Record<string, any>;
  sync_frequency_minutes: number | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  wand_integration_sources?: {
    name: string;
    integration_type: string;
    description: string;
    required_config_fields: string[];
  };
}

interface IntegrationDestination {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'ftp' | 'database';
  status: 'active' | 'inactive';
  syncFrequency: string;
  lastSync: string;
  endpoint?: string;
  schedule?: string;
}


const mockDestinations: IntegrationDestination[] = [
  {
    id: '1',
    name: 'Digital Menu Board System',
    type: 'api',
    status: 'active',
    syncFrequency: 'Real-time',
    lastSync: '30 seconds ago',
    endpoint: 'https://menuboards.example.com/api',
    schedule: 'On product update'
  }
];

const SOURCE_TYPES = [
  { value: 'api', label: 'REST API', icon: Database, color: 'blue' },
  { value: 'spreadsheet', label: 'Spreadsheet', icon: FileSpreadsheet, color: 'green' },
  { value: 'json', label: 'JSON File', icon: FileJson, color: 'purple' },
  { value: 'ftp', label: 'FTP Server', icon: Server, color: 'orange' }
];

const DESTINATION_TYPES = [
  { value: 'api', label: 'REST API', icon: Database, color: 'blue' },
  { value: 'webhook', label: 'Webhook', icon: Zap, color: 'purple' },
  { value: 'ftp', label: 'FTP Server', icon: Server, color: 'orange' },
  { value: 'database', label: 'Database', icon: Database, color: 'green' }
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
  const { location } = useLocation();
  const [sourceConfigs, setSourceConfigs] = useState<IntegrationSourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinations] = useState<IntegrationDestination[]>(mockDestinations);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [showAddDestinationModal, setShowAddDestinationModal] = useState(false);
  const [expandedDestinations, setExpandedDestinations] = useState<Record<string, boolean>>({});
  const [syncingConfigs, setSyncingConfigs] = useState<Set<string>>(new Set());

  const hasLocation = location.concept || location.company || location.store;

  useEffect(() => {
    loadSourceConfigs();
  }, []);

  const loadSourceConfigs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('integration_source_configs')
      .select(`
        *,
        wand_integration_sources (
          name,
          integration_type,
          description,
          required_config_fields
        )
      `)
      .order('config_name');
    if (data) setSourceConfigs(data);
    setLoading(false);
  };

  const handleToggleActive = async (configId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // If activating, validate that required fields are filled
    if (newStatus) {
      const config = sourceConfigs.find(c => c.id === configId);
      if (config?.wand_integration_sources) {
        const source = config.wand_integration_sources;
        const missingFields: string[] = [];

        source.required_config_fields?.forEach((field: string) => {
          if (!config.config_params?.[field] || config.config_params[field].trim() === '') {
            missingFields.push(field);
          }
        });

        if (missingFields.length > 0) {
          alert(`Cannot activate: Missing required fields:\n${missingFields.join(', ')}\n\nPlease edit the configuration and fill in all required fields.`);
          return;
        }
      }
    }

    const { error } = await supabase
      .from('integration_source_configs')
      .update({ is_active: newStatus })
      .eq('id', configId);

    if (error) {
      console.error('Failed to toggle active status:', error);
    } else {
      setSourceConfigs(prev =>
        prev.map(config =>
          config.id === configId
            ? { ...config, is_active: newStatus }
            : config
        )
      );
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  function getSourceIcon(type: string) {
    const sourceType = SOURCE_TYPES.find(t => t.value === type);
    return sourceType?.icon || Database;
  }

  function getSourceColor(type: string) {
    const sourceType = SOURCE_TYPES.find(t => t.value === type);
    return sourceType?.color || 'blue';
  }

  function getDestinationIcon(type: string) {
    const destType = DESTINATION_TYPES.find(t => t.value === type);
    return destType?.icon || Database;
  }

  function getDestinationColor(type: string) {
    const destType = DESTINATION_TYPES.find(t => t.value === type);
    return destType?.color || 'blue';
  }

  function toggleDestinationExpand(id: string) {
    setExpandedDestinations(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  const handleManualSync = async (configId: string) => {
    if (!confirm('Start manual sync now? This will fetch data from the integration source.')) {
      return;
    }

    setSyncingConfigs(prev => new Set(prev).add(configId));

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-orchestrator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config_id: configId })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Sync completed successfully!\nProducts: ${result.summary?.products_synced || 0}\nModifiers: ${result.summary?.modifiers_synced || 0}\nDiscounts: ${result.summary?.discounts_synced || 0}`);
        loadSourceConfigs();
      } else {
        alert(`Sync failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      alert('Failed to start sync. Check console for details.');
    } finally {
      setSyncingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Integration Access</h1>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!hasLocation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!hasLocation ? 'Select a location first' : ''}
            >
              <Plus className="w-5 h-5" />
              Add Source
            </button>
          </div>
          <p className="text-slate-600">Configure data sources and sync schedules</p>
        </div>

        {/* Location Required Message */}
        {!hasLocation && (
          <LocationRequired action="adding integration sources" className="mb-6" />
        )}

        {/* Active Source Configurations */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : sourceConfigs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-2">No integration source configurations</p>
            <p className="text-sm text-slate-500">Click "Add Source" to configure a WAND integration source</p>
          </div>
        ) : (
        <div className="space-y-4">
          {sourceConfigs.map(config => {
            const Icon = Database;
            const color = 'blue';

            return (
              <div key={config.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 bg-${color}-100 rounded-lg`}>
                        <Icon className={`w-6 h-6 text-${color}-600`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{config.config_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Database className="w-4 h-4" />
                            {config.wand_integration_sources?.name || 'Unknown'}
                          </span>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                            {config.wand_integration_sources?.integration_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                            {config.application_level.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {config.is_active ? (
                        <button
                          onClick={() => handleToggleActive(config.id, config.is_active)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        >
                          <ToggleRight className="w-4 h-4" />
                          Active
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(config.id, config.is_active)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                          <ToggleLeft className="w-4 h-4" />
                          Inactive
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingConfigId(config.id);
                          setShowEditModal(true);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit configuration"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleManualSync(config.id)}
                        disabled={!config.is_active || syncingConfigs.has(config.id)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={config.is_active ? 'Sync now' : 'Activate to sync'}
                      >
                        <RefreshCw className={`w-4 h-4 text-blue-600 ${syncingConfigs.has(config.id) ? 'animate-spin' : ''}`} />
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
                        <div className="text-sm font-medium text-slate-900">
                          {config.sync_frequency_minutes ? `Every ${config.sync_frequency_minutes} min` : 'Not configured'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Last Sync</div>
                        <div className="text-sm font-medium text-slate-900">{formatLastSync(config.last_sync_at)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Schedule</div>
                        <div className="text-sm font-medium text-slate-900">{config.config?.schedule || 'Manual'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}

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

        {/* Integration Forwarding Section */}
        <div className="mt-12">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Integration Forwarding</h2>
              <button
                onClick={() => setShowAddDestinationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Destination
              </button>
            </div>
            <p className="text-slate-600">Send product data to external systems and applications</p>
          </div>

          {/* Active Destinations */}
          <div className="space-y-4">
            {destinations.map(destination => {
              const Icon = getDestinationIcon(destination.type);
              const color = getDestinationColor(destination.type);
              const isExpanded = expandedDestinations[destination.id];

              return (
                <div key={destination.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 bg-${color}-100 rounded-lg`}>
                          <Send className={`w-6 h-6 text-${color}-600`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1">{destination.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Link className="w-4 h-4" />
                              {DESTINATION_TYPES.find(t => t.value === destination.type)?.label}
                            </span>
                            {destination.endpoint && (
                              <span className="flex items-center gap-1">
                                <Server className="w-4 h-4" />
                                {destination.endpoint}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {destination.status === 'active' ? (
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
                        <button
                          onClick={() => toggleDestinationExpand(destination.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
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
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Zap className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Sync Frequency</div>
                          <div className="text-sm font-medium text-slate-900">{destination.syncFrequency}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Clock className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Last Sync</div>
                          <div className="text-sm font-medium text-slate-900">{destination.lastSync}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Schedule</div>
                          <div className="text-sm font-medium text-slate-900">{destination.schedule}</div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Mapping Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Field Mapping</h4>
                        <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-500">
                          <p className="text-sm">Field mapping configuration will be available here</p>
                          <p className="text-xs mt-1">TBD - Coming soon</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Box for Forwarding */}
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="font-semibold text-green-900 mb-2">About Integration Forwarding</h3>
            <p className="text-sm text-green-800 mb-3">
              Automatically send product data to external systems when changes occur. Configure destinations to keep your digital menu boards, mobile apps, and other systems up-to-date.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm text-green-800">
              <div>
                <strong>Supported Destinations:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>REST APIs with webhooks</li>
                  <li>Real-time event streaming</li>
                  <li>FTP/SFTP file exports</li>
                  <li>Direct database connections</li>
                </ul>
              </div>
              <div>
                <strong>Forwarding Options:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Real-time on product updates</li>
                  <li>Scheduled batch exports</li>
                  <li>Custom field mapping</li>
                  <li>Conditional forwarding rules</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && hasLocation && (
        <AddWandIntegrationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSourceConfigs();
          }}
          conceptId={location.concept?.id}
          companyId={location.company?.id}
          storeId={location.store?.id}
        />
      )}

      {/* Edit Source Modal */}
      {showEditModal && editingConfigId && (
        <EditWandIntegrationModal
          configId={editingConfigId}
          onClose={() => {
            setShowEditModal(false);
            setEditingConfigId(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingConfigId(null);
            loadSourceConfigs();
          }}
        />
      )}

      {/* OLD MODAL PLACEHOLDER - Delete everything from here to Add Destination Modal */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">OLD MODAL</h2>
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

      {/* Add Destination Modal */}
      {showAddDestinationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Add Integration Destination</h2>
              <button
                onClick={() => setShowAddDestinationModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Destination Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Destination Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {DESTINATION_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = selectedDestType === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedDestType(type.value)}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Destination Name</label>
                <input
                  type="text"
                  placeholder="e.g., Digital Menu Board System"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {(selectedDestType === 'api' || selectedDestType === 'webhook') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {selectedDestType === 'webhook' ? 'Webhook URL' : 'API Endpoint'}
                    </label>
                    <input
                      type="url"
                      placeholder="https://api.example.com/v1/products"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Authentication</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-2">
                      <option>API Key</option>
                      <option>Bearer Token</option>
                      <option>Basic Auth</option>
                      <option>OAuth 2.0</option>
                    </select>
                    <input
                      type="password"
                      placeholder="API Key or Token"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {selectedDestType === 'ftp' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Server Address</label>
                      <input
                        type="text"
                        placeholder="ftp.example.com"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
                      <input
                        type="number"
                        placeholder="21"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Export Path</label>
                    <input
                      type="text"
                      placeholder="/exports/products.json"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {selectedDestType === 'database' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Database Type</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option>PostgreSQL</option>
                      <option>MySQL</option>
                      <option>SQL Server</option>
                      <option>MongoDB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Connection String</label>
                    <input
                      type="password"
                      placeholder="postgresql://user:password@host:port/database"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sync Trigger</label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="realtime">Real-time (on product update)</option>
                  <option value="5min">Every 5 minutes</option>
                  <option value="15min">Every 15 minutes</option>
                  <option value="30min">Every 30 minutes</option>
                  <option value="1hour">Every hour</option>
                  <option value="daily">Daily</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="activeDest" className="w-4 h-4 text-green-600 rounded" defaultChecked />
                <label htmlFor="activeDest" className="text-sm text-slate-700">Activate immediately after creation</label>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddDestinationModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                Create Destination
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
