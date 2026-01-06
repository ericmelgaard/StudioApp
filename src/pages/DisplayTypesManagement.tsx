import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Search, Monitor } from 'lucide-react';

interface DisplayType {
  id: string;
  name: string;
  description: string | null;
  category: string;
  specifications: {
    resolution?: string;
    orientation?: string;
    position?: number;
    contentType?: string;
  };
  status: string;
  created_at: string;
  display_count?: number;
}

export default function DisplayTypesManagement() {
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<DisplayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<DisplayType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'signage',
    resolution: '1920x1080',
    orientation: 'horizontal',
    status: 'active'
  });
  const [customResolution, setCustomResolution] = useState(false);

  useEffect(() => {
    loadDisplayTypes();
  }, []);

  useEffect(() => {
    filterDisplayTypes();
  }, [searchTerm, categoryFilter, displayTypes]);

  const loadDisplayTypes = async () => {
    try {
      const { data: types, error: typesError } = await supabase
        .from('display_types')
        .select('*')
        .order('name');

      if (typesError) throw typesError;

      const { data: displays, error: displaysError } = await supabase
        .from('displays')
        .select('display_type_id');

      if (displaysError) throw displaysError;

      const displayCounts = displays.reduce((acc, display) => {
        acc[display.display_type_id] = (acc[display.display_type_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const typesWithCounts = types.map(type => ({
        ...type,
        display_count: displayCounts[type.id] || 0
      }));

      setDisplayTypes(typesWithCounts);
    } catch (error) {
      console.error('Error loading display types:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDisplayTypes = () => {
    let filtered = displayTypes;

    if (searchTerm) {
      filtered = filtered.filter(type =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(type => type.category === categoryFilter);
    }

    setFilteredTypes(filtered);
  };

  const handleOpenModal = (type?: DisplayType) => {
    if (type) {
      setEditingType(type);
      const resolution = type.specifications?.resolution || '1920x1080';
      const isCustom = !['1920x1080', '1080x1920', '3840x2160', '2160x3840'].includes(resolution);
      setCustomResolution(isCustom);
      setFormData({
        name: type.name,
        description: type.description || '',
        category: type.category,
        resolution: resolution,
        orientation: type.specifications?.orientation || 'horizontal',
        status: type.status
      });
    } else {
      setEditingType(null);
      setCustomResolution(false);
      setFormData({
        name: '',
        description: '',
        category: 'signage',
        resolution: '1920x1080',
        orientation: 'horizontal',
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setCustomResolution(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const specifications = {
      resolution: formData.resolution,
      orientation: formData.orientation
    };

    try {
      if (editingType) {
        const { error } = await supabase
          .from('display_types')
          .update({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            specifications,
            status: formData.status
          })
          .eq('id', editingType.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('display_types')
          .insert({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            specifications,
            status: formData.status
          });

        if (error) throw error;
      }

      await loadDisplayTypes();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving display type:', error);
      alert('Failed to save display type');
    }
  };

  const handleDelete = async (type: DisplayType) => {
    if (type.display_count && type.display_count > 0) {
      alert(`Cannot delete "${type.name}" because it is being used by ${type.display_count} display(s). Please reassign or remove those displays first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${type.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('display_types')
        .delete()
        .eq('id', type.id);

      if (error) throw error;

      await loadDisplayTypes();
    } catch (error) {
      console.error('Error deleting display type:', error);
      alert('Failed to delete display type');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      signage: 'bg-blue-100 text-blue-800',
      vertical: 'bg-purple-100 text-purple-800',
      horizontal: 'bg-teal-100 text-teal-800',
      specialty: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading display types...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Display Types</h1>
            <p className="text-gray-600 mt-1">Manage display templates and configurations</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Display Type
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search display types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="signage">Signage</option>
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
            <option value="specialty">Specialty</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resolution
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Use
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTypes.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{type.name}</div>
                      {type.description && (
                        <div className="text-sm text-gray-500">{type.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(type.category)}`}>
                    {type.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {type.specifications?.resolution || 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(type.status)}`}>
                    {type.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {type.display_count || 0} display{type.display_count !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(type)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(type)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTypes.length === 0 && (
          <div className="text-center py-12">
            <Monitor className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No display types found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating a new display type'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingType ? 'Edit Display Type' : 'New Display Type'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="signage">Signage</option>
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="specialty">Specialty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution *
                </label>
                {!customResolution ? (
                  <div className="space-y-2">
                    <select
                      value={formData.resolution}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setCustomResolution(true);
                          setFormData({ ...formData, resolution: '' });
                        } else {
                          setFormData({ ...formData, resolution: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="1920x1080">1920x1080 (Horizontal)</option>
                      <option value="1080x1920">1080x1920 (Vertical)</option>
                      <option value="3840x2160">3840x2160 (4K Horizontal)</option>
                      <option value="2160x3840">2160x3840 (4K Vertical)</option>
                      <option value="custom">Custom Resolution...</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.resolution}
                      onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                      placeholder="e.g., 1366x768"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomResolution(false);
                        setFormData({ ...formData, resolution: '1920x1080' });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Use standard resolutions
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
