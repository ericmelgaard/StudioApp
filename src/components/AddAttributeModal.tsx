import { useState } from 'react';
import { X, Search, Info, Image, List, Activity } from 'lucide-react';

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

interface AddAttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAttributes: AvailableAttribute[];
  existingAttributeNames: string[];
  sectionType: string;
  onAddFromLibrary: (attributeId: string) => Promise<void>;
  onCreateCustom: (attribute: {
    name: string;
    label: string;
    type: string;
    required: boolean;
  }) => Promise<void>;
}

export default function AddAttributeModal({
  isOpen,
  onClose,
  availableAttributes,
  existingAttributeNames,
  sectionType,
  onAddFromLibrary,
  onCreateCustom,
}: AddAttributeModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>('');
  const [customAttribute, setCustomAttribute] = useState({
    name: '',
    label: '',
    type: 'text',
    required: false,
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const filteredAttributes = availableAttributes.filter(
    (attr) =>
      !existingAttributeNames.includes(attr.name) &&
      (attr.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attr.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return Image;
      case 'options':
      case 'sizes':
        return List;
      case 'nutrition':
        return Activity;
      default:
        return Info;
    }
  };

  const getTypeDescription = (type: string): string => {
    switch (type) {
      case 'text':
        return 'Single line text field';
      case 'richtext':
        return 'Rich text editor with formatting';
      case 'number':
        return 'Numeric value (integers or decimals)';
      case 'boolean':
        return 'True/false toggle';
      case 'image':
        return 'Image upload field with CDN storage';
      case 'sizes':
        return 'Size selection UI component';
      case 'options':
        return 'Product variations and modifiers';
      case 'array':
        return 'List of multiple values';
      case 'object':
        return 'Structured data with nested fields';
      default:
        return '';
    }
  };

  const handleAddFromLibrary = async () => {
    if (!selectedAttributeId) return;
    setLoading(true);
    try {
      await onAddFromLibrary(selectedAttributeId);
      setSelectedAttributeId('');
      onClose();
    } catch (error) {
      console.error('Error adding attribute:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!customAttribute.name || !customAttribute.label) return;
    setLoading(true);
    try {
      await onCreateCustom(customAttribute);
      setCustomAttribute({ name: '', label: '', type: 'text', required: false });
      onClose();
    } catch (error) {
      console.error('Error creating attribute:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Attribute</h2>
            <p className="text-sm text-slate-600">Add a new attribute to this section</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex items-center px-6">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'library'
                  ? 'text-[#00adf0] border-[#00adf0]'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              From Library
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'custom'
                  ? 'text-[#00adf0] border-[#00adf0]'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Create Custom
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' && (
            <div>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search attributes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredAttributes.length === 0 ? (
                <div className="text-center py-12">
                  <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No available attributes found</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Try adjusting your search or create a custom attribute
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAttributes.map((attr) => {
                    const TypeIcon = getTypeIcon(attr.type);
                    const isSelected = selectedAttributeId === attr.id;

                    return (
                      <button
                        key={attr.id}
                        onClick={() => setSelectedAttributeId(attr.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                          isSelected
                            ? 'border-[#00adf0] bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected ? 'bg-blue-100' : 'bg-slate-100'
                            }`}
                          >
                            <TypeIcon
                              className={`w-5 h-5 ${
                                isSelected ? 'text-[#00adf0]' : 'text-slate-600'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-900">
                                {attr.label}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                {attr.type}
                              </span>
                              {attr.default_required && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                  Required
                                </span>
                              )}
                              {attr.is_system && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  System
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mb-1">
                              Field name: {attr.name}
                            </p>
                            {attr.description && (
                              <p className="text-sm text-slate-500">
                                {attr.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Create a custom attribute</p>
                    <p>
                      Custom attributes are specific to this template and won't be
                      available in the global library.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Field Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., custom_field"
                  value={customAttribute.name}
                  onChange={(e) =>
                    setCustomAttribute({ ...customAttribute, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use lowercase with underscores (e.g., custom_field)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  placeholder="e.g., Custom Field"
                  value={customAttribute.label}
                  onChange={(e) =>
                    setCustomAttribute({ ...customAttribute, label: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  User-friendly name shown in the product editor
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Attribute Type
                </label>
                <select
                  value={customAttribute.type}
                  onChange={(e) =>
                    setCustomAttribute({ ...customAttribute, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="richtext">Rich Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="image">Image</option>
                  <option value="sizes">Sizes</option>
                  <option value="options">Options</option>
                  <option value="array">Array</option>
                  <option value="object">Object</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {getTypeDescription(customAttribute.type)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={customAttribute.required}
                  onChange={(e) =>
                    setCustomAttribute({
                      ...customAttribute,
                      required: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="required" className="text-sm text-slate-700">
                  Required field (must be filled in product editor)
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'library' ? handleAddFromLibrary : handleCreateCustom}
            disabled={
              loading ||
              (activeTab === 'library' ? !selectedAttributeId : !customAttribute.name || !customAttribute.label)
            }
            className="px-4 py-2 bg-[#00adf0] text-white rounded-lg hover:bg-[#0099d6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Attribute'}
          </button>
        </div>
      </div>
    </div>
  );
}
