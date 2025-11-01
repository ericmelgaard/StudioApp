import { useState, useEffect } from 'react';
import { Plus, MapPin, Settings, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WandIntegrationMapperProps {
  onBack: () => void;
}

interface IntegrationSource {
  id: number;
  name: string;
  description: string;
  status: string;
}

interface Template {
  id: number;
  name: string;
  description: string;
}

interface Mapping {
  id: number;
  integration_source_id: number;
  template_id: number;
  source_name: string;
  template_name: string;
  field_mappings: Record<string, any>;
}

export default function WandIntegrationMapper({ onBack }: WandIntegrationMapperProps) {
  const [integrations, setIntegrations] = useState<IntegrationSource[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [integrationsData, templatesData, mappingsData] = await Promise.all([
      supabase.from('integration_sources').select('*').order('name'),
      supabase.from('product_attribute_templates').select('id, name, description').order('name'),
      supabase.from('integration_attribute_mappings').select('*')
    ]);

    if (integrationsData.data) setIntegrations(integrationsData.data);
    if (templatesData.data) setTemplates(templatesData.data);

    if (mappingsData.data) {
      const enrichedMappings = mappingsData.data.map((mapping: any) => {
        const integration = integrationsData.data?.find(i => i.id === mapping.integration_source_id);
        const template = templatesData.data?.find(t => t.id === mapping.template_id);
        return {
          ...mapping,
          source_name: integration?.name || 'Unknown',
          template_name: template?.name || 'Unknown'
        };
      });
      setMappings(enrichedMappings);
    }

    setLoading(false);
  };

  const filteredMappings = selectedIntegration
    ? mappings.filter(m => m.integration_source_id === selectedIntegration)
    : mappings;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Map Integration Templates</h1>
        <p className="text-slate-600">
          Configure global field mappings between integration sources and product templates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Integration Sources
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedIntegration(null)}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  selectedIntegration === null
                    ? 'bg-blue-50 text-blue-900 font-medium'
                    : 'hover:bg-slate-50'
                }`}
              >
                All Sources ({mappings.length})
              </button>
              {integrations.map((integration) => {
                const count = mappings.filter(m => m.integration_source_id === integration.id).length;
                return (
                  <button
                    key={integration.id}
                    onClick={() => setSelectedIntegration(integration.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedIntegration === integration.id
                        ? 'bg-blue-50 text-blue-900 font-medium'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{integration.name}</span>
                      <span className="text-xs text-slate-500">{count}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Add Integration
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedIntegration
                    ? `${integrations.find(i => i.id === selectedIntegration)?.name} Mappings`
                    : 'All Mappings'}
                </h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  Create Mapping
                </button>
              </div>

              <div className="space-y-4">
                {filteredMappings.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                    <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No mappings found</h3>
                    <p className="text-slate-600 mb-4">
                      Create a mapping to connect integration fields to template attributes
                    </p>
                  </div>
                ) : (
                  filteredMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-500">From:</span>
                            <span className="font-semibold text-slate-900">{mapping.source_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-500">To:</span>
                            <span className="font-semibold text-slate-900">{mapping.template_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-3">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Field Mappings
                        </div>
                        <div className="text-sm text-slate-600">
                          {Object.keys(mapping.field_mappings || {}).length} fields mapped
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-6 bg-amber-50 rounded-lg border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-2">Global Integration Mappings</h3>
        <p className="text-sm text-amber-800 mb-3">
          These mappings define how fields from external integration sources (like Qu) are mapped to your
          product template attributes. Once configured here, they apply globally and don't need to be set
          up for each organization.
        </p>
        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li>Mappings connect integration API fields to template core attributes</li>
          <li>Configure once at the global level, use everywhere</li>
          <li>Organizations can override these mappings if needed</li>
          <li>New integration sources can be added and configured here</li>
        </ul>
      </div>
    </div>
  );
}
