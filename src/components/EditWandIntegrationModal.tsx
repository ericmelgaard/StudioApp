import { useState, useEffect } from 'react';
import { X, Database, AlertCircle, Loader2, MapPin, Lock, Unlock, Tag, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QuLocationPicker from './QuLocationPicker';
import { useBrandOptions } from '../hooks/useBrandOptions';

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
  sync_schedule: string | null;
  is_active: boolean;
  brand_options: string[] | null;
  is_brand_inherited: boolean;
  brand_locked: boolean;
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
    syncSchedule: string;
    selectedBrand: string;
    localBrandOptions: string[];
    isBrandInherited: boolean;
    brandLocked: boolean;
  }>({
    configName: '',
    configParams: {},
    credentials: {},
    syncFrequency: 15,
    syncSchedule: 'Manual',
    selectedBrand: '',
    localBrandOptions: [],
    isBrandInherited: true,
    brandLocked: false
  });

  const [showQuLocationPicker, setShowQuLocationPicker] = useState(false);
  const [locationDetails, setLocationDetails] = useState<Record<string, any>>({});
  const [showBrandOverride, setShowBrandOverride] = useState(false);
  const [newLocalBrand, setNewLocalBrand] = useState('');

  const brandOptions = useBrandOptions({ configId });

  useEffect(() => {
    loadConfig();
  }, [configId]);

  useEffect(() => {
    if (config?.wand_integration_sources?.integration_type === 'qu' && configForm.configParams.establishment) {
      loadLocationDetails(configForm.configParams.establishment);
    }
  }, [config?.wand_integration_sources?.integration_type, configForm.configParams.establishment]);

  useEffect(() => {
    // Auto-select brand if only one available and none selected
    if (!configForm.selectedBrand && brandOptions.brands.length === 1) {
      setConfigForm(prev => ({ ...prev, selectedBrand: brandOptions.brands[0] }));
    }
  }, [brandOptions.brands]);

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
        syncFrequency: data.sync_frequency_minutes || 15,
        syncSchedule: data.sync_schedule || 'Manual',
        selectedBrand: data.config_params?.brand || '',
        localBrandOptions: data.brand_options || [],
        isBrandInherited: data.is_brand_inherited !== false,
        brandLocked: data.brand_locked || false
      });
      setShowBrandOverride(data.brand_options && data.brand_options.length > 0);
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

  const loadLocationDetails = async (locationId: string) => {
    try {
      const { data, error } = await supabase
        .from('qu_locations')
        .select('*')
        .eq('id', parseInt(locationId))
        .maybeSingle();

      if (data && !error) {
        setLocationDetails(prev => ({ ...prev, [locationId]: data }));
      }
    } catch (err) {
      console.error('Error loading location details:', err);
    }
  };

  const handleQuLocationSelect = (locationId: number) => {
    handleConfigChange('establishment', locationId.toString());
    setShowQuLocationPicker(false);
  };

  const handleAddLocalBrand = () => {
    const trimmed = newLocalBrand.trim();
    if (trimmed && !configForm.localBrandOptions.includes(trimmed)) {
      setConfigForm(prev => ({
        ...prev,
        localBrandOptions: [...prev.localBrandOptions, trimmed]
      }));
      setNewLocalBrand('');
    }
  };

  const handleRemoveLocalBrand = (brand: string) => {
    setConfigForm(prev => ({
      ...prev,
      localBrandOptions: prev.localBrandOptions.filter(b => b !== brand)
    }));
  };

  const handleToggleBrandOverride = () => {
    if (showBrandOverride) {
      // Reverting to inherited
      setConfigForm(prev => ({
        ...prev,
        localBrandOptions: [],
        isBrandInherited: true
      }));
    } else {
      // Switching to local override
      setConfigForm(prev => ({
        ...prev,
        isBrandInherited: false
      }));
    }
    setShowBrandOverride(!showBrandOverride);
  };

  const handleToggleBrandLock = () => {
    setConfigForm(prev => ({
      ...prev,
      brandLocked: !prev.brandLocked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setError('');
    setSaving(true);

    // Prepare config_params with brand field
    const updatedConfigParams = { ...configForm.configParams };
    if (configForm.selectedBrand) {
      updatedConfigParams.brand = configForm.selectedBrand;
    }

    const { error: saveError } = await supabase
      .from('integration_source_configs')
      .update({
        config_name: configForm.configName,
        config_params: updatedConfigParams,
        credentials: configForm.credentials,
        sync_frequency_minutes: configForm.syncFrequency,
        sync_schedule: configForm.syncSchedule,
        brand_options: configForm.localBrandOptions.length > 0 ? configForm.localBrandOptions : null,
        is_brand_inherited: configForm.isBrandInherited,
        brand_locked: configForm.brandLocked,
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
    <>
      {showQuLocationPicker && configForm.selectedBrand && (
        <QuLocationPicker
          brand={configForm.selectedBrand}
          onSelect={handleQuLocationSelect}
          onClose={() => setShowQuLocationPicker(false)}
        />
      )}
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
                  <p className="text-sm text-blue-800 mb-3">
                    {config.application_level === 'concept'
                      ? 'Concept-level configs should have empty API fields. They indicate source availability only. Configure API values at site level.'
                      : 'API configuration values are location-specific and will NOT be inherited by child locations.'}
                  </p>
                  <div className="space-y-3">
                    {source.required_config_fields.map(field => {
                      // Special handling for brand field
                      if (field === 'brand' && config.application_level !== 'concept') {
                        const activeBrands = showBrandOverride ? configForm.localBrandOptions : brandOptions.brands;
                        return (
                          <div key={field}>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-slate-700">
                                {field}
                                {brandOptions.isInherited && !showBrandOverride && (
                                  <span className="ml-2 text-xs text-blue-600 font-normal">
                                    (from {brandOptions.conceptName})
                                  </span>
                                )}
                                {showBrandOverride && (
                                  <span className="ml-2 text-xs text-green-600 font-normal">
                                    (local override)
                                  </span>
                                )}
                              </label>
                              <div className="flex items-center gap-2">
                                {configForm.brandLocked ? (
                                  <button
                                    type="button"
                                    onClick={handleToggleBrandLock}
                                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                                  >
                                    <Lock size={14} />
                                    Locked
                                  </button>
                                ) : (
                                  <>
                                    {brandOptions.canOverride && !showBrandOverride && (
                                      <button
                                        type="button"
                                        onClick={handleToggleBrandOverride}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                      >
                                        Override
                                      </button>
                                    )}
                                    {showBrandOverride && (
                                      <button
                                        type="button"
                                        onClick={handleToggleBrandOverride}
                                        className="text-xs text-slate-600 hover:text-slate-700"
                                      >
                                        Use inherited
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={handleToggleBrandLock}
                                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-700"
                                    >
                                      <Unlock size={14} />
                                      Lock
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {showBrandOverride ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newLocalBrand}
                                    onChange={(e) => setNewLocalBrand(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocalBrand())}
                                    disabled={configForm.brandLocked}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                                    placeholder="Add brand option"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddLocalBrand}
                                    disabled={!newLocalBrand.trim() || configForm.brandLocked}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                                {configForm.localBrandOptions.length > 0 && (
                                  <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                    {configForm.localBrandOptions.map(brand => (
                                      <div key={brand} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-sm">
                                        <Tag size={12} className="text-blue-600" />
                                        <span>{brand}</span>
                                        {!configForm.brandLocked && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveLocalBrand(brand)}
                                            className="text-slate-400 hover:text-red-600 ml-1"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <select
                                  value={configForm.selectedBrand}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, selectedBrand: e.target.value }))}
                                  disabled={configForm.brandLocked || configForm.localBrandOptions.length === 0}
                                  required
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                                >
                                  <option value="">Select brand...</option>
                                  {configForm.localBrandOptions.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <select
                                value={configForm.selectedBrand}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, selectedBrand: e.target.value }))}
                                disabled={configForm.brandLocked || activeBrands.length === 0}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                              >
                                <option value="">
                                  {activeBrands.length === 0 ? 'No brands configured in concept' : 'Select brand...'}
                                </option>
                                {activeBrands.map(brand => (
                                  <option key={brand} value={brand}>{brand}</option>
                                ))}
                              </select>
                            )}

                            {activeBrands.length === 0 && !showBrandOverride && (
                              <p className="mt-1 text-xs text-amber-600">
                                No brands configured at concept level. Use override to add local brands.
                              </p>
                            )}
                          </div>
                        );
                      }

                      // Regular field rendering
                      return (
                        <div key={field}>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{field}</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={configForm.configParams[field] || ''}
                              onChange={(e) => handleConfigChange(field, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={`Enter ${field}`}
                            />
                            {source.integration_type === 'qu' && field === 'establishment' && (
                              <button
                                type="button"
                                onClick={() => setShowQuLocationPicker(true)}
                                disabled={!configForm.selectedBrand}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={!configForm.selectedBrand ? 'Select brand first' : 'Browse locations from Qu API'}
                              >
                                <MapPin className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                          {source.integration_type === 'qu' && field === 'establishment' && configForm.configParams[field] && locationDetails[configForm.configParams[field]] && (
                            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-sm">
                              <div className="font-medium text-slate-700">
                                {locationDetails[configForm.configParams[field]].name}
                              </div>
                              <div className="text-slate-600 text-xs mt-1">
                                {locationDetails[configForm.configParams[field]].city}, {locationDetails[configForm.configParams[field]].state_code}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Schedule</label>
                  <select
                    value={configForm.syncSchedule}
                    onChange={(e) => setConfigForm({ ...configForm, syncSchedule: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Business hours only">Business hours only</option>
                    <option value="24/7">24/7</option>
                    <option value="Weekdays only">Weekdays only</option>
                    <option value="Weekends only">Weekends only</option>
                    <option value="Night hours only">Night hours only</option>
                  </select>
                </div>
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
    </>
  );
}
