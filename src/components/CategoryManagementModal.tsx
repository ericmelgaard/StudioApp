import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Edit2, Calculator, Globe, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ApiIntegrationSection } from './ApiIntegrationSection';
import CategoryLinkModal from './CategoryLinkModal';
import PriceConfigModal, { PriceConfig } from './PriceConfigModal';
import { FieldBadgeGroup } from './StateBadge';

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  sort_order: number;
  translations: Translation[];
  local_fields?: string[];
  active_integration_source_id?: string | null;
  mapping_id?: string | null;
  integration_type?: string | null;
  last_synced_at?: string | null;
}

interface LinkedSource {
  id: string;
  name: string;
  mapping_id: string;
  integration_type: string;
  last_synced_at?: string;
  isActive: boolean;
  overrideCount?: number;
  price_mode?: string;
  price_value?: number;
  price_range_low?: number;
  price_range_high?: number;
  linked_product_id?: string;
  price_calculation?: any;
}

interface Translation {
  locale: string;
  locale_name: string;
  name: string;
  description: string;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryManagementModal({ isOpen, onClose }: CategoryManagementModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTranslations, setEditTranslations] = useState<Translation[]>([]);
  const [editLocalFields, setEditLocalFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableLocales, setAvailableLocales] = useState<{code: string, name: string}[]>([]);
  const [linkedSources, setLinkedSources] = useState<LinkedSource[]>([]);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [showApiLinkModal, setShowApiLinkModal] = useState(false);
  const [selectedSourceForLinking, setSelectedSourceForLinking] = useState<LinkedSource | null>(null);
  const [showPriceConfigModal, setShowPriceConfigModal] = useState(false);
  const [currentPriceConfig, setCurrentPriceConfig] = useState<PriceConfig | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [showLocaleDropdown, setShowLocaleDropdown] = useState(false);
  const [openFieldDropdown, setOpenFieldDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadAvailableLocales();
    }
  }, [isOpen]);

  async function loadAvailableLocales() {
    const { data } = await supabase
      .from('product_attribute_templates')
      .select('translations')
      .not('translations', 'is', null);

    const localesSet = new Set<string>();
    data?.forEach(template => {
      const translations = template.translations as any[];
      translations?.forEach(t => {
        localesSet.add(`${t.locale}|${t.locale_name}`);
      });
    });

    const locales = Array.from(localesSet).map(str => {
      const [code, name] = str.split('|');
      return { code, name };
    });

    setAvailableLocales(locales);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  }

  async function loadLinkedSources(categoryId: string) {
    const category = categories.find(c => c.id === categoryId);

    const { data: linksData } = await supabase
      .from('product_categories_links')
      .select(`
        id,
        mapping_id,
        integration_type,
        is_active,
        last_synced_at,
        integration_source_id,
        price_mode,
        price_value,
        price_range_low,
        price_range_high,
        linked_product_id,
        price_calculation,
        wand_integration_sources!inner(name)
      `)
      .eq('category_id', categoryId);

    const sources: LinkedSource[] = [];

    if (linksData && linksData.length > 0) {
      sources.push(...linksData.map((link: any) => ({
        id: link.integration_source_id,
        name: link.wand_integration_sources.name,
        mapping_id: link.mapping_id,
        integration_type: link.integration_type,
        last_synced_at: link.last_synced_at,
        isActive: link.is_active,
        overrideCount: 0,
        price_mode: link.price_mode,
        price_value: link.price_value,
        price_range_low: link.price_range_low,
        price_range_high: link.price_range_high,
        linked_product_id: link.linked_product_id,
        price_calculation: link.price_calculation
      })));
    } else if (category?.integration_source_id) {
      const { data: sourceData } = await supabase
        .from('wand_integration_sources')
        .select('name')
        .eq('id', category.integration_source_id)
        .single();

      const { data: linkData } = await supabase
        .from('product_categories_links')
        .select('*')
        .eq('category_id', categoryId)
        .eq('integration_source_id', category.integration_source_id)
        .maybeSingle();

      if (sourceData) {
        sources.push({
          id: category.integration_source_id,
          name: sourceData.name,
          mapping_id: category.integration_category_id || '',
          integration_type: 'product',
          last_synced_at: undefined,
          isActive: true,
          overrideCount: (category.local_fields || []).length,
          price_mode: linkData?.price_mode,
          price_value: linkData?.price_value,
          price_range_low: linkData?.price_range_low,
          price_range_high: linkData?.price_range_high,
          linked_product_id: linkData?.linked_product_id,
          price_calculation: linkData?.price_calculation
        });
      }
    }

    setLinkedSources(sources);

    const activeSource = sources.find(s => s.isActive);
    loadPriceConfigFromSource(activeSource);
  }

  function loadPriceConfigFromSource(activeSource?: LinkedSource) {
    if (!activeSource) {
      setCurrentPriceConfig(null);
      return;
    }

    if (activeSource.price_mode === 'range') {
      setCurrentPriceConfig({
        mode: 'range',
        rangeLow: activeSource.price_range_low || 0,
        rangeHigh: activeSource.price_range_high || 0
      });
    } else if (activeSource.price_mode === 'direct' && activeSource.linked_product_id) {
      setCurrentPriceConfig({
        mode: 'direct',
        fieldLink: {
          type: 'direct',
          directLink: {
            productId: activeSource.linked_product_id,
            productName: 'Linked Product',
            field: 'price',
            linkType: 'product'
          }
        }
      });
    } else if (activeSource.price_mode === 'calculation' && activeSource.price_calculation) {
      setCurrentPriceConfig({
        mode: 'calculation',
        fieldLink: {
          type: 'calculation',
          calculation: activeSource.price_calculation
        }
      });
    } else if (activeSource.price_mode === 'manual' && activeSource.price_value !== undefined) {
      setCurrentPriceConfig({
        mode: 'manual',
        manualValue: activeSource.price_value
      });
    } else {
      setCurrentPriceConfig(null);
    }
  }

  const availableLanguages = () => {
    const langs = [{ code: 'en', name: 'English' }];
    langs.push(...availableLocales);
    return langs;
  };

  const getCurrentName = () => {
    if (currentLanguage === 'en') return editName;
    const translation = editTranslations.find(t => t.locale === currentLanguage);
    return translation?.name || '';
  };

  const getCurrentDescription = () => {
    if (currentLanguage === 'en') return editDescription;
    const translation = editTranslations.find(t => t.locale === currentLanguage);
    return translation?.description || '';
  };

  const updateCurrentName = (value: string) => {
    if (currentLanguage === 'en') {
      setEditName(value);
    } else {
      const existing = editTranslations.find(t => t.locale === currentLanguage);
      if (existing) {
        setEditTranslations(editTranslations.map(t =>
          t.locale === currentLanguage ? { ...t, name: value } : t
        ));
      } else {
        const localeName = availableLocales.find(l => l.code === currentLanguage)?.name || currentLanguage;
        setEditTranslations([...editTranslations, {
          locale: currentLanguage,
          locale_name: localeName,
          name: value,
          description: ''
        }]);
      }
    }
  };

  const updateCurrentDescription = (value: string) => {
    if (currentLanguage === 'en') {
      setEditDescription(value);
    } else {
      const existing = editTranslations.find(t => t.locale === currentLanguage);
      if (existing) {
        setEditTranslations(editTranslations.map(t =>
          t.locale === currentLanguage ? { ...t, description: value } : t
        ));
      } else {
        const localeName = availableLocales.find(l => l.code === currentLanguage)?.name || currentLanguage;
        setEditTranslations([...editTranslations, {
          locale: currentLanguage,
          locale_name: localeName,
          name: '',
          description: value
        }]);
      }
    }
  };

  async function handleSavePriceConfig(config: PriceConfig) {
    if (!editingId) return;

    const activeSource = linkedSources.find(s => s.isActive);
    const currentCategory = categories.find(c => c.id === editingId);

    const sourceId = activeSource?.id || currentCategory?.integration_source_id;
    if (!sourceId) {
      console.error('No integration source found');
      return;
    }

    const { data: linkData } = await supabase
      .from('product_categories_links')
      .select('id')
      .eq('category_id', editingId)
      .eq('integration_source_id', sourceId)
      .maybeSingle();

    const updateData: any = {
      price_mode: config.mode
    };

    if (config.mode === 'range') {
      updateData.price_range_low = config.rangeLow;
      updateData.price_range_high = config.rangeHigh;
      updateData.price_value = null;
      updateData.linked_product_id = null;
      updateData.price_calculation = null;
    } else if (config.mode === 'direct' && config.fieldLink?.directLink) {
      updateData.linked_product_id = config.fieldLink.directLink.productId;
      updateData.price_range_low = null;
      updateData.price_range_high = null;
      updateData.price_value = null;
      updateData.price_calculation = null;
    } else if (config.mode === 'calculation' && config.fieldLink?.calculation) {
      updateData.price_calculation = config.fieldLink.calculation;
      updateData.price_range_low = null;
      updateData.price_range_high = null;
      updateData.price_value = null;
      updateData.linked_product_id = null;
    } else if (config.mode === 'manual') {
      updateData.price_value = config.manualValue;
      updateData.price_range_low = null;
      updateData.price_range_high = null;
      updateData.linked_product_id = null;
      updateData.price_calculation = null;
    }

    if (linkData) {
      const { error } = await supabase
        .from('product_categories_links')
        .update(updateData)
        .eq('id', linkData.id);

      if (error) {
        console.error('Error updating price config:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('product_categories_links')
        .insert([{
          category_id: editingId,
          integration_source_id: sourceId,
          mapping_id: currentCategory?.integration_category_id || activeSource?.mapping_id || 'AA-Dips',
          integration_type: 'product',
          is_active: true,
          ...updateData
        }]);

      if (error) {
        console.error('Error inserting price config:', error);
        return;
      }
    }

    setCurrentPriceConfig(config);
    await loadLinkedSources(editingId);
  }

  async function handleAddCategory() {
    const newCategory = {
      name: 'New Category',
      description: '',
      sort_order: categories.length,
      translations: [],
      local_fields: ['name']
    };

    const { data, error } = await supabase
      .from('product_categories')
      .insert([newCategory])
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data]);
      handleEdit(data);
    }
  }

  async function handleSave() {
    if (!editingId) return;

    setLoading(true);
    const { error } = await supabase
      .from('product_categories')
      .update({
        name: editName,
        description: editDescription || null,
        translations: editTranslations,
        local_fields: editLocalFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingId);

    if (!error) {
      await loadCategories();
      handleCancel();
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Products assigned to it will be unassigned.')) return;

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadCategories();
      if (editingId === id) {
        handleCancel();
      }
    }
  }

  async function handleEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditTranslations(category.translations || []);
    setEditLocalFields(category.local_fields || []);
    setCurrentLanguage('en');
    setShowLocaleDropdown(false);
    setCurrentPriceConfig(null);
    await loadLinkedSources(category.id);
  }

  function handleCancel() {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditTranslations([]);
    setEditLocalFields([]);
    setCurrentLanguage('en');
    setShowLocaleDropdown(false);
    setLinkedSources([]);
    setViewingSourceId(null);
    setCurrentPriceConfig(null);
  }

  async function handleLinkCategory(integrationData: { sourceId: string; categoryName: string; integrationType: string } | null) {
    if (!editingId) return;

    if (integrationData === null) {
      await handleUnlinkCategory();
      setShowApiLinkModal(false);
      return;
    }

    const isFirstLink = linkedSources.length === 0;

    const { error } = await supabase
      .from('product_categories_links')
      .insert({
        category_id: editingId,
        integration_source_id: integrationData.sourceId,
        mapping_id: integrationData.categoryName,
        integration_type: integrationData.integrationType,
        is_active: isFirstLink,
        price_mode: 'range',
      });

    if (!error) {
      if (isFirstLink) {
        await supabase
          .from('product_categories')
          .update({
            active_integration_source_id: integrationData.sourceId,
            integration_source_id: integrationData.sourceId,
            integration_category_id: integrationData.categoryName,
            mapping_id: integrationData.categoryName,
            integration_type: integrationData.integrationType,
            local_fields: [],
          })
          .eq('id', editingId);

        setEditLocalFields([]);
      }
      await loadLinkedSources(editingId);
      await loadCategories();
      setShowApiLinkModal(false);
    } else {
      alert('Failed to link category: ' + error.message);
    }
  }

  async function handleUnlinkCategory() {
    if (!editingId) return;
    if (!confirm('Are you sure you want to unlink all API sources?')) return;

    await supabase
      .from('product_categories_links')
      .delete()
      .eq('category_id', editingId);

    await supabase
      .from('product_categories')
      .update({
        active_integration_source_id: null,
        mapping_id: null,
        integration_type: null,
        local_fields: ['name', 'description'],
      })
      .eq('id', editingId);

    setLinkedSources([]);
    setEditLocalFields(['name', 'description']);
    await loadCategories();
  }

  async function handleViewSource(sourceId: string) {
    if (viewingSourceId === sourceId) {
      setViewingSourceId(null);
    } else {
      setViewingSourceId(sourceId);
    }
  }

  async function handleChangeLink(source: LinkedSource) {
    setSelectedSourceForLinking(source);
    setShowApiLinkModal(true);
  }

  function handleToggleLocalField(fieldName: string) {
    const isLocal = editLocalFields.includes(fieldName);
    if (isLocal) {
      setEditLocalFields(editLocalFields.filter(f => f !== fieldName));
    } else {
      setEditLocalFields([...editLocalFields, fieldName]);
    }
  }

  const currentCategory = editingId ? categories.find(c => c.id === editingId) : null;
  const isNameLocal = editLocalFields.includes('name');

  const activeLink = linkedSources.find(s => s.isActive);
  const currentCategoryItem = activeLink ? {
    mapping_id: activeLink.mapping_id,
    integration_source_id: activeLink.id,
    integration_type: activeLink.integration_type,
    last_synced_at: activeLink.last_synced_at,
    local_fields: editLocalFields
  } : null;

  const hasApiLink = linkedSources.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Manage Categories</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-600">
              Create and manage product categories. Categories can be assigned to multiple products.
            </p>
            <button
              onClick={handleAddCategory}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`border rounded-lg p-4 transition-colors ${
                  editingId === category.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {editingId === category.id ? (
                  <div className="space-y-4">
                    <ApiIntegrationSection
                      mode="edit"
                      linkedSources={linkedSources}
                      viewingSourceId={viewingSourceId}
                      currentItem={currentCategoryItem}
                      onViewSource={handleViewSource}
                      onChangeLink={handleChangeLink}
                      onUnlink={handleUnlinkCategory}
                      onLinkNew={() => setShowApiLinkModal(true)}
                    />

                    {availableLanguages().length > 1 && (
                      <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            Editing {availableLanguages().find(l => l.code === currentLanguage)?.name} translation
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowLocaleDropdown(!showLocaleDropdown)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                          >
                            <span className="text-sm font-medium text-slate-700">
                              {availableLanguages().find(l => l.code === currentLanguage)?.name || 'English'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          </button>
                          {showLocaleDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-[80] overflow-hidden">
                              {availableLanguages().map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() => {
                                    setCurrentLanguage(lang.code);
                                    setShowLocaleDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
                                    currentLanguage === lang.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                                  }`}
                                >
                                  <span>{lang.name}</span>
                                  {currentLanguage === lang.code && <Check className="w-4 h-4" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Category Name
                        </label>
                        {hasApiLink ? (
                          <div className="relative">
                            {isNameLocal ? (
                              <>
                                <button
                                  onClick={() => setOpenFieldDropdown(openFieldDropdown === 'name' ? null : 'name')}
                                  className="flex items-center gap-1 text-xs text-slate-600 font-medium hover:text-slate-800 transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Custom
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                {openFieldDropdown === 'name' && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() => setOpenFieldDropdown(null)}
                                    />
                                    <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                                      <button
                                        onClick={() => {
                                          handleToggleLocalField('name');
                                          setOpenFieldDropdown(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                                      >
                                        Inherit from API
                                      </button>
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600 font-medium">
                                <Link2 className="w-3 h-3" />
                                Syncing
                              </div>
                            )}
                          </div>
                        ) : (
                          <FieldBadgeGroup badges={[
                            { variant: 'local' as const, text: 'Custom' }
                          ]} />
                        )}
                      </div>
                      <input
                        type="text"
                        value={getCurrentName()}
                        onChange={(e) => {
                          updateCurrentName(e.target.value);
                          if (hasApiLink && !isNameLocal) {
                            setEditLocalFields([...editLocalFields, 'name']);
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter category name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={getCurrentDescription()}
                        onChange={(e) => updateCurrentDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter description"
                        rows={2}
                      />
                    </div>

                    {hasApiLink && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Price
                          </label>
                          <FieldBadgeGroup badges={[
                            currentPriceConfig?.mode === 'manual'
                              ? { variant: 'local' as const, text: 'Custom' }
                              : currentPriceConfig?.mode === 'range'
                              ? { variant: 'api' as const, text: 'Syncing' }
                              : currentPriceConfig?.mode === 'calculation'
                              ? { variant: 'calculated' as const, text: 'Calculated' }
                              : currentPriceConfig?.mode === 'direct'
                              ? { variant: 'api' as const, text: 'Syncing' }
                              : { variant: 'local' as const, text: 'Not set' }
                          ]} />
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={currentPriceConfig
                              ? currentPriceConfig.mode === 'range'
                                ? currentPriceConfig.rangeLow === currentPriceConfig.rangeHigh
                                  ? `$${currentPriceConfig.rangeLow?.toFixed(2) || '0.00'}`
                                  : `$${currentPriceConfig.rangeLow?.toFixed(2) || '0.00'} - $${currentPriceConfig.rangeHigh?.toFixed(2) || '0.00'}`
                                : currentPriceConfig.mode === 'direct'
                                ? 'Direct Link'
                                : currentPriceConfig.mode === 'calculation'
                                ? 'Calculated'
                                : `$${currentPriceConfig.manualValue || 0}`
                              : 'Not set'}
                            disabled
                            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                            placeholder="Configure price"
                          />
                          <button
                            onClick={() => setShowPriceConfigModal(true)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Configure price"
                          >
                            <Calculator className={`w-4 h-4 ${currentPriceConfig ? 'text-blue-600' : ''}`} />
                          </button>
                        </div>
                        {currentPriceConfig && currentPriceConfig.mode === 'range' && (
                          <p className="text-xs text-slate-500 mt-1">
                            Price range based on products in this category
                          </p>
                        )}
                        {currentPriceConfig && currentPriceConfig.mode === 'calculation' && (
                          <p className="text-xs text-slate-500 mt-1">
                            Price calculated from linked items
                          </p>
                        )}
                        {currentPriceConfig && currentPriceConfig.mode === 'direct' && (
                          <p className="text-xs text-slate-500 mt-1">
                            Price linked to another product
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={loading || !editName.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                      )}
                      {category.translations && category.translations.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Globe className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {category.translations.length} translation(s)
                          </span>
                        </div>
                      )}
                      {category.active_integration_source_id && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Linked to API
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p>No categories yet. Click "Add Category" to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showApiLinkModal && (
        <CategoryLinkModal
          isOpen={showApiLinkModal}
          onClose={() => {
            setShowApiLinkModal(false);
            setSelectedSourceForLinking(null);
          }}
          onLink={handleLinkCategory}
          currentSourceId={selectedSourceForLinking?.id}
          currentCategoryId={editingId || undefined}
          currentMappingId={activeLink?.mapping_id}
          isChangingLink={!!selectedSourceForLinking}
        />
      )}

      <PriceConfigModal
        isOpen={showPriceConfigModal}
        onClose={() => setShowPriceConfigModal(false)}
        onSave={handleSavePriceConfig}
        currentConfig={currentPriceConfig}
        entityType="category"
        categoryId={editingId || undefined}
        integrationSourceId={
          linkedSources.find(s => s.isActive)?.id ||
          categories.find(c => c.id === editingId)?.integration_source_id ||
          undefined
        }
      />
    </div>
  );
}
