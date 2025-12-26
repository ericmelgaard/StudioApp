import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Copy, Layers, Search, Package, Building2, Store, Globe, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TemplateSectionService, SectionSetting, Location } from '../lib/templateSectionService';
import Toast from '../components/Toast';
import Breadcrumb from '../components/Breadcrumb';
import { useLocation } from '../hooks/useLocation';

interface WandTemplateManagerProps {
  onBack: () => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  attribute_schema: {
    core_attributes: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
    }>;
  };
  is_system: boolean;
  created_at: string;
}

interface TemplateUsageStats {
  productCount: number;
  conceptCount: number;
  companyCount: number;
  storeCount: number;
}

type TabType = 'overview' | 'sections' | 'settings';

export default function WandTemplateManager({ onBack }: WandTemplateManagerProps) {
  const { location, setLocation } = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sectionSettings, setSectionSettings] = useState<SectionSetting[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [usageStats, setUsageStats] = useState<TemplateUsageStats | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && activeTab === 'sections') {
      loadSectionSettings();
    }
  }, [selectedTemplate, activeTab, location]);

  useEffect(() => {
    if (selectedTemplate) {
      loadUsageStats();
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_attribute_templates')
      .select('*')
      .order('name');

    if (data) {
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    }
    setLoading(false);
  };

  const loadSectionSettings = async () => {
    if (!selectedTemplate) return;

    setLoadingSections(true);
    try {
      const locationParam: Location = {
        concept_id: location.concept?.id || null,
        company_id: location.company?.id || null,
        store_id: location.store?.id || null,
      };
      const settings = await TemplateSectionService.getEffectiveSectionSettings(
        selectedTemplate.id,
        locationParam
      );
      setSectionSettings(settings);
    } catch (error) {
      console.error('Error loading section settings:', error);
      setToastMessage('Failed to load section settings');
    }
    setLoadingSections(false);
  };

  const loadUsageStats = async () => {
    if (!selectedTemplate) return;

    try {
      const stats = await TemplateSectionService.getTemplateUsageStats(selectedTemplate.id);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const handleToggleSection = async (sectionId: string, currentEnabled: boolean) => {
    if (!selectedTemplate) return;

    setSavingSection(sectionId);
    try {
      const locationParam: Location = {
        concept_id: location.concept?.id || null,
        company_id: location.company?.id || null,
        store_id: location.store?.id || null,
      };
      await TemplateSectionService.updateSectionSetting({
        template_id: selectedTemplate.id,
        section_id: sectionId,
        is_enabled: !currentEnabled,
        location: locationParam,
      });

      await loadSectionSettings();
      setToastMessage(`Section ${currentEnabled ? 'disabled' : 'enabled'} successfully`);
    } catch (error: any) {
      console.error('Error toggling section:', error);
      setToastMessage(error.message || 'Failed to update section');
    }
    setSavingSection(null);
  };

  const handleResetToParent = async (sectionId: string) => {
    if (!selectedTemplate) return;

    setSavingSection(sectionId);
    try {
      const locationParam: Location = {
        concept_id: location.concept?.id || null,
        company_id: location.company?.id || null,
        store_id: location.store?.id || null,
      };
      await TemplateSectionService.resetToParent(selectedTemplate.id, sectionId, locationParam);
      await loadSectionSettings();
      setToastMessage('Section reset to parent settings');
    } catch (error) {
      console.error('Error resetting section:', error);
      setToastMessage('Failed to reset section');
    }
    setSavingSection(null);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSectionIcon = (sectionName: string) => {
    switch (sectionName) {
      case 'core_attributes':
        return Layers;
      case 'extended_attributes':
        return Plus;
      case 'images':
        return Package;
      case 'options':
        return CheckCircle;
      case 'nutrition':
        return AlertCircle;
      default:
        return Layers;
    }
  };

  const getBreadcrumbItems = () => {
    const items = [
      { label: 'WAND Digital', onClick: () => setLocation({}) }
    ];

    if (location.concept) {
      items.push({
        label: location.concept.name,
        onClick: () => setLocation({ concept: location.concept })
      });
    }

    if (location.company) {
      items.push({
        label: location.company.name,
        onClick: () => setLocation({ concept: location.concept, company: location.company })
      });
    }

    if (location.store) {
      items.push({ label: location.store.name });
    }

    return items;
  };

  const getLocationLevelDisplay = () => {
    if (location.store) return 'Store Level';
    if (location.company) return 'Company Level';
    if (location.concept) return 'Concept Level';
    return 'WAND Level (Global Default)';
  };

  return (
    <div className="max-w-[1800px] mx-auto h-[calc(100vh-200px)]">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#00adf0] to-[#0099d6] rounded-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Manage Templates</h1>
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>
          </div>
          <button className="px-4 py-2 bg-[#00adf0] text-white rounded-lg hover:bg-[#0099d6] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Current Context:</strong> {getLocationLevelDisplay()} - Section visibility settings will be applied at this level and cascade down the hierarchy.
          </p>
        </div>
      </div>

      <div className="flex gap-6 h-full">
        <div className="w-96 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="p-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-50 border-2 border-[#00adf0]'
                        : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        selectedTemplate?.id === template.id ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        <Layers className={`w-4 h-4 ${
                          selectedTemplate?.id === template.id ? 'text-[#00adf0]' : 'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate">{template.name}</h3>
                          {template.is_system && (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded shrink-0">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{template.description}</p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <ChevronRight className="w-4 h-4 text-[#00adf0] shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
          {selectedTemplate ? (
            <>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Layers className="w-6 h-6 text-[#00adf0]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-slate-900">{selectedTemplate.name}</h2>
                        {selectedTemplate.is_system && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                            System Template
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!selectedTemplate.is_system && (
                      <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {usageStats && (
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{usageStats.productCount} products</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{usageStats.conceptCount} concepts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{usageStats.companyCount} companies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{usageStats.storeCount} stores</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-b border-slate-200">
                <div className="flex items-center px-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'overview'
                        ? 'text-[#00adf0] border-[#00adf0]'
                        : 'text-slate-600 border-transparent hover:text-slate-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('sections')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'sections'
                        ? 'text-[#00adf0] border-[#00adf0]'
                        : 'text-slate-600 border-transparent hover:text-slate-900'
                    }`}
                  >
                    Section Visibility
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'settings'
                        ? 'text-[#00adf0] border-[#00adf0]'
                        : 'text-slate-600 border-transparent hover:text-slate-900'
                    }`}
                  >
                    Settings
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'overview' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Core Attributes</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedTemplate.attribute_schema.core_attributes.map((attr, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-900">{attr.label}</span>
                              {attr.required && (
                                <span className="text-xs text-red-500 font-semibold">Required</span>
                              )}
                            </div>
                            <span className="text-sm text-slate-500">Type: {attr.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2">About This Template</h3>
                      <p className="text-sm text-blue-800">
                        This template defines the core attribute structure for products across your organization.
                        Use the Section Visibility tab to control which sections are visible at different location levels.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'sections' && (
                  <div>
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900 mb-1">Location Context</h3>
                          <p className="text-sm text-slate-600">{getLocationLevelDisplay()}</p>
                        </div>
                        <button
                          onClick={loadSectionSettings}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {loadingSections ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sectionSettings.map((section) => {
                          const SectionIcon = getSectionIcon(section.section_name);
                          const isSaving = savingSection === section.section_id;

                          return (
                            <div
                              key={section.section_id}
                              className={`p-4 rounded-lg border transition-colors ${
                                section.is_enabled
                                  ? 'bg-white border-slate-200'
                                  : 'bg-slate-50 border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`p-2 rounded-lg ${
                                    section.is_enabled ? 'bg-blue-50' : 'bg-slate-200'
                                  }`}>
                                    <SectionIcon className={`w-5 h-5 ${
                                      section.is_enabled ? 'text-[#00adf0]' : 'text-slate-400'
                                    }`} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-slate-900">{section.section_label}</h4>
                                      {section.is_inherited && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                                          Inherited from {section.inherited_from}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600">Type: {section.section_type}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {section.is_inherited && (location.concept || location.company || location.store) && (
                                    <button
                                      onClick={() => handleResetToParent(section.section_id)}
                                      disabled={isSaving}
                                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                    >
                                      Reset to Parent
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleToggleSection(section.section_id, section.is_enabled)}
                                    disabled={isSaving}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                                      section.is_enabled ? 'bg-[#00adf0]' : 'bg-slate-300'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        section.is_enabled ? 'translate-x-6' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                  {section.is_enabled ? (
                                    <Eye className="w-5 h-5 text-[#00adf0]" />
                                  ) : (
                                    <EyeOff className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900 mb-1">Section Visibility Rules</h4>
                          <ul className="text-sm text-amber-800 space-y-1">
                            <li>Disabled sections will not appear in the product editor</li>
                            <li>At least one section must remain enabled</li>
                            <li>Changes cascade down the location hierarchy (WAND → Concept → Company → Store)</li>
                            <li>Child locations can override parent settings</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div>
                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                      <h3 className="font-semibold text-slate-900 mb-2">Template Settings</h3>
                      <p className="text-sm text-slate-600">
                        Advanced settings and configuration options for this template.
                      </p>
                      <p className="text-sm text-slate-500 mt-4 italic">
                        Additional settings coming soon...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a template to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          duration={3000}
        />
      )}
    </div>
  );
}
