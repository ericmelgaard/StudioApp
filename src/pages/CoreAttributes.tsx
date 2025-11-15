import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Shield, Tag, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CoreAttributesProps {
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

interface Attribute {
  id: string;
  name: string;
  label: string;
  type: string;
  default_required: boolean;
  description: string | null;
  category: string | null;
  section_id: string | null;
  is_system: boolean;
  created_at: string;
  attribute_sections?: AttributeSection;
}

const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'image', label: 'Image' },
  { value: 'sizes', label: 'Sizes' }
];

const getIconForSection = (icon: string | null) => {
  switch (icon) {
    case 'layers': return '📋';
    case 'sliders': return '⚙️';
    case 'image': return '🖼️';
    case 'list': return '📝';
    case 'activity': return '🍎';
    default: return '📁';
  }
};

export default function CoreAttributes({ onBack }: CoreAttributesProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [sections, setSections] = useState<AttributeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  useEffect(() => {
    loadSections();
    loadAttributes();
  }, []);

  const loadSections = async () => {
    const { data, error } = await supabase
      .from('attribute_sections')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error loading sections:', error);
    } else if (data) {
      setSections(data);
    }
  };

  const loadAttributes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('available_attributes')
      .select('*, attribute_sections(*)')
      .order('name');

    if (error) {
      console.error('Error loading attributes:', error);
    } else if (data) {
      setAttributes(data);
    }
    setLoading(false);
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

    const matchesSection = sectionFilter === 'all' || attr.section_id === sectionFilter;

    return matchesSearch && matchesSection;
  });

  const groupedAttributes = filteredAttributes.reduce((acc, attr) => {
    const sectionId = attr.section_id || 'uncategorized';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(attr);
    return acc;
  }, {} as Record<string, Attribute[]>);

  const getSectionById = (sectionId: string) => {
    return sections.find(s => s.id === sectionId);
  };

  const getSectionLabel = (sectionId: string) => {
    if (sectionId === 'uncategorized') return 'Uncategorized';
    const section = getSectionById(sectionId);
    return section?.label || 'Unknown Section';
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
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Sections</option>
          {sections.map(section => (
            <option key={section.id} value={section.id}>{section.label}</option>
          ))}
        </select>
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
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAttributes)
            .sort(([aId], [bId]) => {
              if (aId === 'uncategorized') return 1;
              if (bId === 'uncategorized') return -1;
              const aSection = getSectionById(aId);
              const bSection = getSectionById(bId);
              return (aSection?.display_order || 999) - (bSection?.display_order || 999);
            })
            .map(([sectionId, attrs]) => {
              const section = getSectionById(sectionId);
              return (
                <div key={sectionId} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      {section && (
                        <span className="text-2xl">{getIconForSection(section.icon)}</span>
                      )}
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          {getSectionLabel(sectionId)}
                          <span className="ml-2 text-sm font-normal text-slate-500">
                            ({attrs.length} {attrs.length === 1 ? 'attribute' : 'attributes'})
                          </span>
                        </h2>
                        {section?.description && (
                          <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                        )}
                      </div>
                    </div>
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
              );
            })}
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
          <li>Sections help organize attributes by their purpose and usage</li>
        </ul>
      </div>

      {showAddModal && (
        <AddAttributeModal
          sections={sections}
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
          sections={sections}
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

function AddAttributeModal({ sections, onClose, onSuccess }: { sections: AttributeSection[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'text',
    default_required: false,
    description: '',
    section_id: sections[0]?.id || ''
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
        section_id: formData.section_id,
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
                Section <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.label}</option>
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

function EditAttributeModal({ attribute, sections, onClose, onSuccess }: { attribute: Attribute; sections: AttributeSection[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    label: attribute.label,
    type: attribute.type,
    default_required: attribute.default_required,
    description: attribute.description || '',
    section_id: attribute.section_id || sections[0]?.id || ''
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
        section_id: formData.section_id
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
                Section <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.label}</option>
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
