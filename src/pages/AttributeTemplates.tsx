import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileCode, Check, Search, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AttributeTemplatesProps {
  onBack: () => void;
}

interface AttributeSection {
  id: string;
  name: string;
  label: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_system: boolean;
  section_type: string;
}

interface AttributeTemplate {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  attribute_schema: any;
  translations?: any;
  created_at: string;
  updated_at: string;
}

interface OrganizationSettings {
  id: string;
  default_product_attribute_template_id: string | null;
}

export default function AttributeTemplates({ onBack }: AttributeTemplatesProps) {
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [sections, setSections] = useState<AttributeSection[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AttributeTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, sectionsRes, settingsRes] = await Promise.all([
        supabase.from('product_attribute_templates').select('*').order('name'),
        supabase.from('attribute_sections').select('*').order('display_order'),
        supabase.from('organization_settings').select('*').limit(1).maybeSingle()
      ]);

      if (templatesRes.data) {
        setTemplates(templatesRes.data);
        if (templatesRes.data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(templatesRes.data[0]);
        }
      }
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultTemplate = async (templateId: string) => {
    try {
      if (settings) {
        await supabase
          .from('organization_settings')
          .update({ default_product_attribute_template_id: templateId })
          .eq('id', settings.id);
      } else {
        await supabase
          .from('organization_settings')
          .insert({
            organization_id: null,
            default_product_attribute_template_id: templateId
          });
      }
      await loadData();
    } catch (error) {
      console.error('Error setting default template:', error);
      alert('Failed to set default template');
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isDefaultTemplate = (templateId: string) => {
    return settings?.default_product_attribute_template_id === templateId;
  };

  const getAttributeCount = (template: AttributeTemplate) => {
    const schema = template.attribute_schema || {};
    const coreCount = schema.core_attributes?.length || 0;
    const extendedCount = schema.extended_attributes?.length || 0;
    const optionCount = schema.option_attributes?.length || 0;
    return coreCount + extendedCount + optionCount;
  };

  return (
    <div className="max-w-[1800px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Attribute Templates</h1>
            <p className="text-slate-600">
              Manage product attribute templates that define the structure and fields for different product types
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                      </div>
                      {isDefaultTemplate(template.id) && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Default
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{getAttributeCount(template)} attributes</span>
                      {template.is_system && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">System</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-8">
                  <FileCode className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No templates found</p>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-8">
            {selectedTemplate ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedTemplate.name}</h2>
                    <p className="text-sm text-slate-600 mt-1">{selectedTemplate.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isDefaultTemplate(selectedTemplate.id) && (
                      <button
                        onClick={() => setDefaultTemplate(selectedTemplate.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Template Sections</h3>
                    <div className="space-y-4">
                      {sections.map((section) => (
                        <div
                          key={section.id}
                          className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Layers className="w-5 h-5 text-slate-600" />
                              <div>
                                <h4 className="font-semibold text-slate-900">{section.label}</h4>
                                {section.description && (
                                  <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                                )}
                              </div>
                            </div>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                              Configure
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Structure</h3>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <pre className="text-xs text-slate-700 overflow-auto">
                        {JSON.stringify(selectedTemplate.attribute_schema, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                  <button className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors">
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Save Changes
                  </button>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                    Push to Products
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                <FileCode className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg text-slate-600">Select a template to view and edit its configuration</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
