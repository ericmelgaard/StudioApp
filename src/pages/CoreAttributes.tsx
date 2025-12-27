import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Shield, Tag, X, AlertCircle, List, Grid3x3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CoreAttributesProps {
  onBack: () => void;
}

interface Attribute {
  id: string;
  name: string;
  label: string;
  type: string;
  default_required: boolean;
  description: string | null;
  category: string | null;
  is_system: boolean;
  created_at: string;
}

interface TemplateUsage {
  template_id: string;
  template_name: string;
  usage_type: 'core' | 'option' | 'extended';
}

const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'image', label: 'Image' },
  { value: 'sizes', label: 'Sizes' }
];

const CATEGORIES = [
  { value: 'basic', label: 'Basic Information' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'dietary', label: 'Dietary' },
  { value: 'media', label: 'Media' },
  { value: 'organization', label: 'Organization' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'operations', label: 'Operations' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'taste', label: 'Taste Profile' }
];

export default function CoreAttributes({ onBack }: CoreAttributesProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [templateUsage, setTemplateUsage] = useState<Record<string, TemplateUsage[]>>({});

  useEffect(() => {
    loadAttributes();
    loadTemplateUsage();
  }, []);

  const loadAttributes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('available_attributes')
      .select('*')
      .order('category')
      .order('name');

    if (error) {
      console.error('Error loading attributes:', error);
    } else if (data) {
      setAttributes(data);
    }
    setLoading(false);
  };

  const loadTemplateUsage = async () => {
    const { data, error } = await supabase
      .from('product_attribute_templates')
      .select('id, name, attribute_schema');

    if (error) {
      console.error('Error loading template usage:', error);
      return;
    }

    const usageMap: Record<string, TemplateUsage[]> = {};

    data?.forEach(template => {
      const schema = template.attribute_schema as any;

      ['core_attributes', 'option_attributes', 'extended_attributes'].forEach(attrType => {
        const attrs = schema?.[attrType] || [];
        attrs.forEach((attr: any) => {
          if (!usageMap[attr.name]) {
            usageMap[attr.name] = [];
          }
          usageMap[attr.name].push({
            template_id: template.id,
            template_name: template.name,
            usage_type: attrType === 'core_attributes' ? 'core' :
                       attrType === 'option_attributes' ? 'option' : 'extended'
          });
        });
      });
    });

    setTemplateUsage(usageMap);
  };

  const handleDelete = async (attribute: Attribute) => {
    if (attribute.is_system) {
      alert('System attributes cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${attribute.label}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('available_attributes')
      .delete()
      .eq('id', attribute.id);

    if (!error) {
      loadAttributes();
    }
  };

  const filteredAttributes = attributes.filter(attr => {
    const matchesSearch =
      attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attr.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attr.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || attr.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const groupedAttributes = filteredAttributes.reduce((acc, attr) => {
    const category = attr.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(attr);
    return acc;
  }, {} as Record<string, Attribute[]>);

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Core Attributes</h1>
          <p className="text-slate-600">
            Manage the library of available product attributes used throughout the system
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Attribute
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search attributes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <div className="flex border border-slate-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 flex items-center gap-2 transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 flex items-center gap-2 transition-colors border-l border-slate-300 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAttributes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No attributes found</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Attribute
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Used In Templates
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAttributes.map(attr => {
                const usage = templateUsage[attr.name] || [];
                return (
                  <tr key={attr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">{attr.label}</span>
                            {attr.is_system && (
                              <Shield className="w-4 h-4 text-blue-600" title="System attribute" />
                            )}
                            {attr.default_required && (
                              <span className="text-red-500 text-sm">*</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">
                            {attr.name}
                          </div>
                        </div>
                      </div>
                      {attr.description && (
                        <p className="text-xs text-slate-600 mt-2">{attr.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {ATTRIBUTE_TYPES.find(t => t.value === attr.type)?.label || attr.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {getCategoryLabel(attr.category || '')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {usage.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {usage.map((template, idx) => (
                            <div
                              key={`${template.template_id}-${idx}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              <span>{template.template_name}</span>
                              <span className="text-blue-500 text-[10px] uppercase font-semibold">
                                ({template.usage_type})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not used in any template</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedAttribute(attr);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                          disabled={attr.is_system}
                          title="Edit attribute"
                        >
                          <Edit2 className={`w-4 h-4 ${attr.is_system ? 'text-slate-300' : 'text-slate-600'}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(attr)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          disabled={attr.is_system}
                          title="Delete attribute"
                        >
                          <Trash2 className={`w-4 h-4 ${attr.is_system ? 'text-slate-300' : 'text-red-600'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAttributes).map(([category, attrs]) => (
            <div key={category} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  {getCategoryLabel(category)}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({attrs.length} {attrs.length === 1 ? 'attribute' : 'attributes'})
                  </span>
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attrs.map(attr => (
                    <div
                      key={attr.id}
                      className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{attr.label}</h3>
                            {attr.is_system && (
                              <Shield className="w-4 h-4 text-blue-600" title="System attribute" />
                            )}
                            {attr.default_required && (
                              <span className="text-red-500 text-sm">*</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">
                            {attr.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedAttribute(attr);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                            disabled={attr.is_system}
                          >
                            <Edit2 className={`w-3.5 h-3.5 ${attr.is_system ? 'text-slate-300' : 'text-slate-600'}`} />
                          </button>
                          <button
                            onClick={() => handleDelete(attr)}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            disabled={attr.is_system}
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${attr.is_system ? 'text-slate-300' : 'text-red-600'}`} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Type:</span>
                          <span className="font-medium text-slate-700">
                            {ATTRIBUTE_TYPES.find(t => t.value === attr.type)?.label || attr.type}
                          </span>
                        </div>
                        {attr.description && (
                          <p className="text-xs text-slate-600 mt-2">{attr.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">About Core Attributes</h3>
        <p className="text-sm text-blue-800 mb-3">
          Core attributes define the available fields that can be used across product templates and data structures.
          These attributes are shared system-wide and provide consistency across all products.
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>System attributes (marked with shield icon) cannot be modified or deleted</li>
          <li>Custom attributes can be created to extend the available fields</li>
          <li>Attributes marked with * are required by default in templates</li>
          <li>Categories help organize attributes by their purpose and usage</li>
        </ul>
      </div>

      {showAddModal && (
        <AddAttributeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadAttributes();
          }}
        />
      )}

      {showEditModal && selectedAttribute && (
        <EditAttributeModal
          attribute={selectedAttribute}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAttribute(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedAttribute(null);
            loadAttributes();
          }}
        />
      )}
    </div>
  );
}

function AddAttributeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'text',
    default_required: false,
    description: '',
    category: 'basic'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error: saveError } = await supabase
      .from('available_attributes')
      .insert({
        name: formData.name,
        label: formData.label,
        type: formData.type,
        default_required: formData.default_required,
        description: formData.description || null,
        category: formData.category,
        is_system: false
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
          <h2 className="text-xl font-bold text-slate-900">Add Core Attribute</h2>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Field Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="e.g., custom_field"
              />
              <p className="text-xs text-slate-500 mt-1">Lowercase, use underscores</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Custom Field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ATTRIBUTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of what this attribute represents"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="default_required"
              checked={formData.default_required}
              onChange={(e) => setFormData({ ...formData, default_required: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="default_required" className="text-sm text-slate-700">
              Required by default in templates
            </label>
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
              {saving ? 'Creating...' : 'Create Attribute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAttributeModal({ attribute, onClose, onSuccess }: { attribute: Attribute; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    label: attribute.label,
    type: attribute.type,
    default_required: attribute.default_required,
    description: attribute.description || '',
    category: attribute.category || 'basic'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error: saveError } = await supabase
      .from('available_attributes')
      .update({
        label: formData.label,
        type: formData.type,
        default_required: formData.default_required,
        description: formData.description || null,
        category: formData.category
      })
      .eq('id', attribute.id);

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
          <h2 className="text-xl font-bold text-slate-900">Edit Core Attribute</h2>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Field Name</label>
            <input
              type="text"
              value={attribute.name}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Field name cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Display Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ATTRIBUTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit_default_required"
              checked={formData.default_required}
              onChange={(e) => setFormData({ ...formData, default_required: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="edit_default_required" className="text-sm text-slate-700">
              Required by default in templates
            </label>
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
