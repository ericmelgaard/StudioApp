import { useState, useEffect } from 'react';
import { X, Database, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WandIntegrationSource {
  id: string;
  name: string;
  integration_type: string;
  description: string;
  base_url_template: string;
  auth_method: string;
  required_config_fields: string[];
  optional_config_fields: string[];
  default_sync_frequency_minutes: number;
  formatter_name: string;
  supports_products: boolean;
  supports_modifiers: boolean;
  supports_discounts: boolean;
  status: string;
}

interface IntegrationSourceConfig {
  id: string;
  config_name: string;
  wand_source_id: string;
  application_level: 'concept' | 'company' | 'site';
  concept_id: number | null;
  company_id: number | null;
  site_id: number | null;
  config_params: Record<string, any>;
  credentials: Record<string, any>;
  sync_frequency_minutes: number | null;
  is_active: boolean;
  wand_integration_sources?: WandIntegrationSource;
}

interface EditWandIntegrationModalProps {
  configId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditWandIntegrationModal({ configId, onClose, onSuccess }: EditWandIntegrationModalProps) {
  const [config, setConfig] = useState<IntegrationSourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [configForm, setConfigForm] = useState<{
    configName: string;
    configParams: Record<string, string>;
    credentials: Record<string, string>;
    syncFrequency: number;
  }>({
    configName: '',
    configParams: {},
    credentials: {},
    syncFrequency: 15
  });

  useEffect(() => {
    loadConfig();
  }, [configId]);

  const loadConfig = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('integration_source_configs')
      .select(`
        *,
        wand_integration_sources (*)
      `)
      .eq('id', configId)
      .single();

    if (loadError) {
      setError('Failed to load configuration');
      console.error(loadError);
    } else if (data) {
      setConfig(data);
      setConfigForm({
        configName: data.config_name,
        configParams: data.config_params || {},
        credentials: data.credentials || {},
        syncFrequency: data.sync_frequency_minutes || 15
      });
    }
    setLoading(false);
  };

  const handleConfigChange = (field: string, value: string) => {
    setConfigForm(prev => ({
      ...prev,
      configParams: {
        ...prev.configParams,
        [field]: value
      }
    }));
  };

  const handleCredentialChange = (field: string, value: string) => {
    setConfigForm(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setError('');
    setSaving(true);

    const { error: saveError } = await supabase
      .from('integration_source_configs')
      .update({
        config_name: configForm.configName,
        config_params: configForm.configParams,
        credentials: configForm.credentials,
        sync_frequency_minutes: configForm.syncFrequency,
        updated_at: new Date().toISOString()
      })
      .eq('id', configId);

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
    } else {
      onSuccess();
    }
  };

  const source = config?.wand_integration_sources;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Configuration</h2>
            {source && (
              <p className="text-sm text-slate-600 mt-1">{source.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-600">Loading configuration...</p>
            </div>
          ) : config && source ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Configuration Name</label>
                <input
                  type="text"
                  required
                  value={configForm.configName}
                  onChange={(e) => setConfigForm({ ...configForm, configName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Toast POS - Main Location"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-1">Read-Only Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Integration Type:</span>
                    <span className="ml-2 font-mono text-slate-900">{source.integration_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Application Level:</span>
                    <span className="ml-2 font-medium text-slate-900">{config.application_level.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {source.required_config_fields.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Required Configuration Fields</h3>
                  <div className="space-y-3">
                    {source.required_config_fields.map(field => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{field}</label>
                        <input
                          type="text"
                          required
                          value={configForm.configParams[field] || ''}
                          onChange={(e) => handleConfigChange(field, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Enter ${field}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {source.optional_config_fields.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Optional Configuration Fields</h3>
                  <div className="space-y-3">
                    {source.optional_config_fields.map(field => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{field}</label>
                        <input
                          type="text"
                          value={configForm.configParams[field] || ''}
                          onChange={(e) => handleConfigChange(field, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Enter ${field} (optional)`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {source.auth_method !== 'none' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">Authentication</h3>
                  <p className="text-sm text-amber-800 mb-3">This integration requires: {source.auth_method}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">API Key / Token</label>
                      <input
                        type="password"
                        value={configForm.credentials.api_key || ''}
                        onChange={(e) => handleCredentialChange('api_key', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter API key or authentication token"
                      />
                      <p className="text-xs text-amber-700 mt-1">Leave empty to keep existing credentials</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sync Frequency (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={configForm.syncFrequency}
                  onChange={(e) => setConfigForm({ ...configForm, syncFrequency: parseInt(e.target.value) })}
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
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
              <p className="text-slate-600">Failed to load configuration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
