import { useState, useEffect } from 'react';
import { Settings, Play, Trash2, Edit2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IntegrationConfigurationsProps {
  onBack: () => void;
}

interface IntegrationConfig {
  id: string;
  config_name: string;
  wand_source: {
    name: string;
    integration_type: string;
  };
  application_level: string;
  concept_id?: number;
  company_id?: number;
  site_id?: number;
  concept?: { name: string };
  company?: { name: string };
  site?: { name: string };
  config_params: Record<string, any>;
  is_active: boolean;
  last_sync_at?: string;
  sync_count: number;
  error_count: number;
}

export default function IntegrationConfigurations({ onBack }: IntegrationConfigurationsProps) {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('integration_source_configs')
      .select(`
        id,
        config_name,
        application_level,
        concept_id,
        company_id,
        site_id,
        config_params,
        is_active,
        last_sync_at,
        sync_count,
        error_count,
        wand_source:wand_source_id (
          name,
          integration_type
        ),
        concept:concept_id (name),
        company:company_id (name),
        site:site_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading configs:', error);
    } else if (data) {
      setConfigs(data as any);
    }
    setLoading(false);
  };

  const handleSync = async (configId: string) => {
    setSyncing(configId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ config_id: configId }),
        }
      );

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      console.log('Sync result:', result);
      alert(`Sync completed! ${result.counts?.total || 0} items synced.`);
      loadConfigs();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (config: IntegrationConfig) => {
    if (!confirm(`Delete configuration "${config.config_name}"?`)) return;

    const { error } = await supabase
      .from('integration_source_configs')
      .delete()
      .eq('id', config.id);

    if (!error) {
      loadConfigs();
    }
  };

  const getLocationName = (config: IntegrationConfig) => {
    if (config.application_level === 'concept') return config.concept?.name || `Concept ${config.concept_id}`;
    if (config.application_level === 'company') return config.company?.name || `Company ${config.company_id}`;
    if (config.application_level === 'site') return config.site?.name || `Site ${config.site_id}`;
    return 'Unknown';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Integration Configurations</h1>
          <p className="text-slate-600">
            Manage applied integration configurations at concept, company, and site levels
          </p>
        </div>
        <button
          onClick={() => alert('Configuration wizard coming soon!')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Configuration
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No configurations found</p>
          <p className="text-sm text-slate-500 mt-2">Apply an integration from the WAND library to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map(config => (
            <div key={config.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{config.config_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="font-medium text-blue-600">{config.wand_source?.name}</span>
                    <span>•</span>
                    <span className="capitalize">{config.application_level} Level</span>
                    <span>•</span>
                    <span>{getLocationName(config)}</span>
                  </div>
                  {config.last_sync_at && (
                    <div className="mt-2 text-xs text-slate-500">
                      Last synced: {new Date(config.last_sync_at).toLocaleString()} ({config.sync_count} syncs, {config.error_count} errors)
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(config.id)}
                    disabled={syncing === config.id}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Sync Now"
                  >
                    <Play className={`w-5 h-5 text-blue-600 ${syncing === config.id ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Configuration"
                  >
                    <Edit2 className="w-5 h-5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(config)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Configuration"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
