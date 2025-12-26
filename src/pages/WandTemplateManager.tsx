import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Copy, Layers, Search, Package, Building2, Store, Globe, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TemplateSectionService, SectionSetting, Location } from '../lib/templateSectionService';
import Toast from '../components/Toast';
import Breadcrumb from '../components/Breadcrumb';
import { useLocation } from '../hooks/useLocation';
import AddAttributeModal from '../components/AddAttributeModal';
import MoneyFormatSettings, { MoneyFormatConfig } from '../components/MoneyFormatSettings';

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
  money_format_settings?: MoneyFormatConfig;
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

interface AttributeField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  section_id?: string;
}

interface AvailableAttribute {
  id: string;
  name: string;
  label: string;
  type: string;
  default_required: boolean;
  description: string | null;
  category: string | null;
  section_id: string | null;
  is_system: boolean;
}

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
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [availableAttributes, setAvailableAttributes] = useState<AvailableAttribute[]>([]);
  const [showAddAttributeModal, setShowAddAttributeModal] = useState(false);
  const [addAttributeTab, setAddAttributeTab] = useState<'library' | 'custom'>('library');
  const [moneyFormatSettings, setMoneyFormatSettings] = useState<MoneyFormatConfig>({
    show_currency_symbol: true,
    currency_symbol: '$',
    symbol_position: 'before',
    symbol_style: 'normal',
    decimal_places: 2,
    show_cents: true,
    thousands_separator: ',',
    decimal_separator: '.',
    rounding_mode: 'round',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && (activeTab === 'sections' || activeTab === 'overview')) {
      loadSectionSettings();
      if (activeTab === 'sections') {
        loadAvailableAttributes();
      }
    }
  }, [selectedTemplate, activeTab, location]);

  useEffect(() => {
    if (sectionSettings.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sectionSettings[0].section_id);
    }
  }, [sectionSettings]);

  useEffect(() => {
    if (selectedTemplate) {
      loadUsageStats();
      if (selectedTemplate.money_format_settings) {
        setMoneyFormatSettings(selectedTemplate.money_format_settings);
      }
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

  const loadAvailableAttributes = async () => {
    try {
      const { data, error } = await supabase
        .from('available_attributes')
        .select('*')
        .order('category, name');

      if (error) throw error;
      if (data) setAvailableAttributes(data);
    } catch (error) {
      console.error('Error loading available attributes:', error);
      setToastMessage('Failed to load available attributes');
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

  const getAttributeCountForSection = (sectionName: string): number => {
    if (!selectedTemplate) return 0;

    const schema = selectedTemplate.attribute_schema;
    switch (sectionName) {
      case 'core_attributes':
        return schema.core_attributes?.length || 0;
      case 'extended_attributes':
        return schema.extended_attributes?.length || 0;
      case 'images':
        return schema.core_attributes?.filter(a => a.type === 'image').length || 0;
      case 'options':
        return schema.core_attributes?.filter(a => a.type === 'options' || a.type === 'sizes').length || 0;
      case 'nutrition':
        return schema.core_attributes?.filter(a => a.name.includes('nutrition') || a.name.includes('calorie')).length || 0;
      default:
        return 0;
    }
  };

  const getAttributesForSection = (sectionName: string): AttributeField[] => {
    if (!selectedTemplate) return [];

    const schema = selectedTemplate.attribute_schema;
    switch (sectionName) {
      case 'core_attributes':
        return schema.core_attributes || [];
      case 'extended_attributes':
        return schema.extended_attributes || [];
      case 'images':
        return schema.core_attributes?.filter(a => a.type === 'image') || [];
      case 'options':
        return schema.core_attributes?.filter(a => a.type === 'options' || a.type === 'sizes') || [];
      case 'nutrition':
        return schema.core_attributes?.filter(a => a.name.includes('nutrition') || a.name.includes('calorie')) || [];
      default:
        return [];
    }
  };

  const getSectionDescription = (sectionType: string): string => {
    switch (sectionType) {
      case 'core':
        return 'Essential product information used across all product types';
      case 'extended':
        return 'Custom attributes specific to this template';
      case 'images':
        return 'Product images and visual assets';
      case 'options':
        return 'Product variations and modifiers (e.g., sizes, add-ons)';
      case 'nutrition':
        return 'Nutritional information and dietary data';
      default:
        return 'Custom section attributes';
    }
  };

  const getSectionGuidance = (sectionType: string): React.ReactNode | null => {
    switch (sectionType) {
      case 'images':
        return (
          <ul className="space-y-1">
            <li>Image attributes allow file uploads in the product editor</li>
            <li>Supported formats: JPG, PNG, WebP</li>
            <li>Images are automatically optimized and stored in CDN</li>
            <li>Recommended maximum size: 5MB per image</li>
          </ul>
        );
      case 'options':
        return (
          <ul className="space-y-1">
            <li>Option attributes create product variations with their own attribute schema</li>
            <li>Use "sizes" type for size selection UI components</li>
            <li>Use "options" type for modifiers and add-ons</li>
            <li>Each option can have its own price, SKU, and availability</li>
          </ul>
        );
      case 'nutrition':
        return (
          <ul className="space-y-1">
            <li>Nutrition attributes store dietary and nutritional information</li>
            <li>Include fields like calories, protein, carbs, allergens</li>
            <li>Use boolean types for dietary flags (vegan, gluten-free, etc.)</li>
          </ul>
        );
      default:
        return null;
    }
  };

  const handleAddFromLibrary = async (attributeId: string) => {
    if (!selectedTemplate || !selectedSectionId) return;

    const selectedSection = sectionSettings.find(s => s.section_id === selectedSectionId);
    if (!selectedSection) return;

    const attribute = availableAttributes.find(a => a.id === attributeId);
    if (!attribute) return;

    try {
      const newAttribute = {
        name: attribute.name,
        label: attribute.label,
        type: attribute.type,
        required: attribute.default_required,
      };

      const updatedSchema = { ...selectedTemplate.attribute_schema };
      const sectionName = selectedSection.section_name;

      if (sectionName === 'core_attributes') {
        updatedSchema.core_attributes = [...updatedSchema.core_attributes, newAttribute];
      } else if (sectionName === 'extended_attributes') {
        updatedSchema.extended_attributes = [...(updatedSchema.extended_attributes || []), newAttribute];
      }

      const { error } = await supabase
        .from('product_attribute_templates')
        .update({ attribute_schema: updatedSchema })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      await loadTemplates();
      setToastMessage('Attribute added successfully');
    } catch (error) {
      console.error('Error adding attribute:', error);
      setToastMessage('Failed to add attribute');
      throw error;
    }
  };

  const handleCreateCustomAttribute = async (attribute: {
    name: string;
    label: string;
    type: string;
    required: boolean;
  }) => {
    if (!selectedTemplate || !selectedSectionId) return;

    const selectedSection = sectionSettings.find(s => s.section_id === selectedSectionId);
    if (!selectedSection) return;

    try {
      const updatedSchema = { ...selectedTemplate.attribute_schema };
      const sectionName = selectedSection.section_name;

      if (sectionName === 'core_attributes') {
        updatedSchema.core_attributes = [...updatedSchema.core_attributes, attribute];
      } else if (sectionName === 'extended_attributes') {
        updatedSchema.extended_attributes = [...(updatedSchema.extended_attributes || []), attribute];
      }

      const { error } = await supabase
        .from('product_attribute_templates')
        .update({ attribute_schema: updatedSchema })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      await loadTemplates();
      setToastMessage('Custom attribute created successfully');
    } catch (error) {
      console.error('Error creating attribute:', error);
      setToastMessage('Failed to create attribute');
      throw error;
    }
  };

  const handleRemoveAttribute = async (attributeName: string) => {
    if (!selectedTemplate || !selectedSectionId) return;

    const selectedSection = sectionSettings.find(s => s.section_id === selectedSectionId);
    if (!selectedSection) return;

    if (!confirm(`Remove attribute "${attributeName}"? This will affect all products using this template.`)) {
      return;
    }

    try {
      const updatedSchema = { ...selectedTemplate.attribute_schema };
      const sectionName = selectedSection.section_name;

      if (sectionName === 'core_attributes') {
        updatedSchema.core_attributes = updatedSchema.core_attributes.filter(a => a.name !== attributeName);
      } else if (sectionName === 'extended_attributes') {
        updatedSchema.extended_attributes = (updatedSchema.extended_attributes || []).filter(a => a.name !== attributeName);
      }

      const { error } = await supabase
        .from('product_attribute_templates')
        .update({ attribute_schema: updatedSchema })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      await loadTemplates();
      setToastMessage('Attribute removed successfully');
    } catch (error) {
      console.error('Error removing attribute:', error);
      setToastMessage('Failed to remove attribute');
    }
  };

  const handleSaveMoneyFormatSettings = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('product_attribute_templates')
        .update({ money_format_settings: moneyFormatSettings })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      await loadTemplates();
      setToastMessage('Money format settings saved successfully');
    } catch (error) {
      console.error('Error saving money format settings:', error);
      setToastMessage('Failed to save money format settings');
    }
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
                    Section Attributes
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
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Section Visibility</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            Control which sections are visible for products using this template
                          </p>
                        </div>
                        <div className="text-sm text-slate-600">
                          {getLocationLevelDisplay()}
                        </div>
                      </div>

                      {loadingSections ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {sectionSettings.map((section) => {
                            const SectionIcon = getSectionIcon(section.section_name);
                            const isSaving = savingSection === section.section_id;
                            const attributeCount = getAttributeCountForSection(section.section_name);

                            return (
                              <div
                                key={section.section_id}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                  section.is_enabled
                                    ? 'bg-white border-[#00adf0] shadow-sm'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-start gap-3 mb-3">
                                  <div className={`p-2 rounded-lg ${
                                    section.is_enabled ? 'bg-blue-50' : 'bg-slate-200'
                                  }`}>
                                    <SectionIcon className={`w-5 h-5 ${
                                      section.is_enabled ? 'text-[#00adf0]' : 'text-slate-400'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className={`font-semibold ${
                                        section.is_enabled ? 'text-slate-900' : 'text-slate-500'
                                      }`}>
                                        {section.section_label}
                                      </h4>
                                      {section.is_inherited && (
                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded shrink-0">
                                          Inherited
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-600 mb-2">
                                      {getSectionDescription(section.section_type)}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span>{attributeCount} attributes</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${
                                      section.is_enabled ? 'text-[#00adf0]' : 'text-slate-500'
                                    }`}>
                                      {section.is_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    {section.is_enabled ? (
                                      <Eye className="w-4 h-4 text-[#00adf0]" />
                                    ) : (
                                      <EyeOff className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {section.is_inherited && (location.concept || location.company || location.store) && (
                                      <button
                                        onClick={() => handleResetToParent(section.section_id)}
                                        disabled={isSaving}
                                        className="text-xs text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="Reset to parent settings"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleToggleSection(section.section_id, section.is_enabled)}
                                      disabled={isSaving}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                                        section.is_enabled ? 'bg-[#00adf0]' : 'bg-slate-300'
                                      }`}
                                      title={section.is_enabled ? 'Click to disable' : 'Click to enable'}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          section.is_enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2">About This Template</h3>
                      <p className="text-sm text-blue-800">
                        This template defines the core attribute structure for products across your organization.
                        Toggle sections above to control their visibility at the current location level. Use the "Section Attributes" tab to manage the specific attributes within each section.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'sections' && (
                  <div className="flex gap-6 h-full">
                    <div className="w-64 flex flex-col bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">Sections</h3>
                        <p className="text-xs text-slate-600">{getLocationLevelDisplay()}</p>
                      </div>

                      {loadingSections ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {sectionSettings.map((section) => {
                            const SectionIcon = getSectionIcon(section.section_name);
                            const isSelected = selectedSectionId === section.section_id;
                            const attributeCount = getAttributeCountForSection(section.section_name);

                            return (
                              <button
                                key={section.section_id}
                                onClick={() => setSelectedSectionId(section.section_id)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                  isSelected
                                    ? 'bg-white border-2 border-[#00adf0] shadow-sm'
                                    : 'bg-white border border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded ${
                                    isSelected ? 'bg-blue-50' : 'bg-slate-100'
                                  }`}>
                                    <SectionIcon className={`w-4 h-4 ${
                                      isSelected ? 'text-[#00adf0]' : 'text-slate-600'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-medium truncate ${
                                        isSelected ? 'text-[#00adf0]' : 'text-slate-900'
                                      }`}>
                                        {section.section_label}
                                      </span>
                                      {!section.is_enabled && (
                                        <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-xs text-slate-500">{attributeCount} attrs</span>
                                      {section.is_inherited && (
                                        <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                                          Inherited
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col">
                      {selectedSectionId && !loadingSections ? (
                        <div className="h-full flex flex-col">
                          {(() => {
                            const selectedSection = sectionSettings.find(s => s.section_id === selectedSectionId);
                            if (!selectedSection) return null;

                            const SectionIcon = getSectionIcon(selectedSection.section_name);
                            const isSaving = savingSection === selectedSection.section_id;
                            const sectionAttributes = getAttributesForSection(selectedSection.section_name);

                            return (
                              <>
                                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                                        <SectionIcon className="w-5 h-5 text-[#00adf0]" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-slate-900">{selectedSection.section_label}</h3>
                                        <p className="text-sm text-slate-600 mt-1">
                                          {getSectionDescription(selectedSection.section_type)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {selectedSection.is_inherited && (location.concept || location.company || location.store) && (
                                        <button
                                          onClick={() => handleResetToParent(selectedSection.section_id)}
                                          disabled={isSaving}
                                          className="text-xs text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                        >
                                          Reset to Parent
                                        </button>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">
                                          {selectedSection.is_enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <button
                                          onClick={() => handleToggleSection(selectedSection.section_id, selectedSection.is_enabled)}
                                          disabled={isSaving}
                                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                                            selectedSection.is_enabled ? 'bg-[#00adf0]' : 'bg-slate-300'
                                          }`}
                                        >
                                          <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                              selectedSection.is_enabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {selectedSection.is_inherited && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded">
                                      <AlertCircle className="w-4 h-4 text-amber-600" />
                                      <span className="text-xs text-amber-800">
                                        Settings inherited from {selectedSection.inherited_from} level
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                  <div className="mb-4 flex items-center justify-between">
                                    <h4 className="font-medium text-slate-900">Attributes ({sectionAttributes.length})</h4>
                                    <button
                                      onClick={() => setShowAddAttributeModal(true)}
                                      className="flex items-center gap-2 px-3 py-2 bg-[#00adf0] text-white rounded-lg hover:bg-[#0099d6] transition-colors text-sm font-medium"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Add Attribute
                                    </button>
                                  </div>

                                  {sectionAttributes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                      <Layers className="w-12 h-12 text-slate-300 mb-3" />
                                      <p className="text-slate-600 font-medium mb-1">No attributes yet</p>
                                      <p className="text-sm text-slate-500">Add attributes to this section to get started</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {sectionAttributes.map((attr, index) => (
                                        <div
                                          key={attr.name}
                                          className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-2">
                                                <span className="font-medium text-slate-900">{attr.label}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  {attr.type}
                                                </span>
                                                {attr.required && (
                                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                                    Required
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-sm text-slate-500">Field name: {attr.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Edit attribute"
                                              >
                                                <Pencil className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => handleRemoveAttribute(attr.name)}
                                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove attribute"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {getSectionGuidance(selectedSection.section_type) && (
                                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex gap-3">
                                      <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                      <div>
                                        <h4 className="font-semibold text-blue-900 mb-1">
                                          {selectedSection.section_label} Guidance
                                        </h4>
                                        <div className="text-sm text-blue-800">
                                          {getSectionGuidance(selectedSection.section_type)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Select a section to manage attributes</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Money Display Format</h3>
                      <p className="text-sm text-slate-600">
                        Configure how monetary values are displayed for products using this template.
                      </p>
                    </div>
                    <MoneyFormatSettings
                      settings={moneyFormatSettings}
                      onChange={setMoneyFormatSettings}
                      onSave={handleSaveMoneyFormatSettings}
                    />
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

      {showAddAttributeModal && selectedTemplate && selectedSectionId && (
        <AddAttributeModal
          isOpen={showAddAttributeModal}
          onClose={() => setShowAddAttributeModal(false)}
          availableAttributes={availableAttributes}
          existingAttributeNames={[
            ...selectedTemplate.attribute_schema.core_attributes.map(a => a.name),
            ...(selectedTemplate.attribute_schema.extended_attributes || []).map(a => a.name),
          ]}
          sectionType={sectionSettings.find(s => s.section_id === selectedSectionId)?.section_type || 'custom'}
          onAddFromLibrary={handleAddFromLibrary}
          onCreateCustom={handleCreateCustomAttribute}
        />
      )}
    </div>
  );
}
