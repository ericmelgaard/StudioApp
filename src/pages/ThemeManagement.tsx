import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Monitor, Edit2, Eye, Trash2, Play, Pause } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ThemeModal from '../components/ThemeModal';

interface Theme {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface DisplayType {
  id: string;
  name: string;
  category: string;
}

interface ThemeWithStats extends Theme {
  deployment_count?: number;
  display_types?: DisplayType[];
}

interface ThemeManagementProps {
  onBack?: () => void;
}

export default function ThemeManagement({ onBack }: ThemeManagementProps) {
  const [themes, setThemes] = useState<ThemeWithStats[]>([]);
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [themesResult, displayTypesResult] = await Promise.all([
      supabase
        .from('themes')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('display_types')
        .select('id, name, category')
        .eq('status', 'active')
        .order('name')
    ]);

    if (themesResult.error) {
      console.error('Error loading themes:', themesResult.error);
    }

    if (displayTypesResult.error) {
      console.error('Error loading display types:', displayTypesResult.error);
    }

    const themesData = themesResult.data || [];

    const themesWithStats = await Promise.all(
      themesData.map(async (theme) => {
        const { count } = await supabase
          .from('placement_routines')
          .select('*', { count: 'exact', head: true })
          .eq('theme_id', theme.id)
          .eq('status', 'active');

        const { data: themeContent } = await supabase
          .from('theme_content')
          .select('display_type_id, display_types(id, name, category)')
          .eq('theme_id', theme.id);

        const displayTypes = themeContent?.map((tc: any) => tc.display_types).filter(Boolean) || [];

        return {
          ...theme,
          deployment_count: count || 0,
          display_types: displayTypes
        };
      })
    );

    setThemes(themesWithStats);
    setDisplayTypes(displayTypesResult.data || []);
    setLoading(false);
  };

  const handleCreateTheme = () => {
    setSelectedTheme(null);
    setShowThemeModal(true);
  };

  const handleEditTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    setShowThemeModal(true);
  };

  const handleDeleteTheme = async (theme: Theme) => {
    if (!confirm(`Are you sure you want to delete "${theme.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('themes')
      .delete()
      .eq('id', theme.id);

    if (error) {
      console.error('Error deleting theme:', error);
      alert(`Failed to delete theme: ${error.message}`);
    } else {
      loadData();
    }
  };

  const handleToggleStatus = async (theme: Theme) => {
    const newStatus = theme.status === 'active' ? 'archived' : 'active';

    const { error } = await supabase
      .from('themes')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', theme.id);

    if (error) {
      console.error('Error updating theme status:', error);
      alert(`Failed to update theme: ${error.message}`);
    } else {
      loadData();
    }
  };

  const filteredThemes = themes.filter(theme => {
    const matchesSearch = theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (theme.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || theme.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'archived':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-slate-600">Loading themes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Display Themes</h1>
          <p className="text-slate-600 mt-1">Manage content themes and deployment schedules</p>
        </div>
        <button
          onClick={handleCreateTheme}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Theme
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {filteredThemes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <Monitor className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No themes found</h3>
          <p className="text-slate-600 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first theme'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={handleCreateTheme}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Theme
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredThemes.map((theme) => (
            <div
              key={theme.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-lg mb-1">{theme.name}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusColor(theme.status)}`}>
                      {theme.status}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleStatus(theme)}
                      className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                      title={theme.status === 'active' ? 'Pause theme' : 'Activate theme'}
                    >
                      {theme.status === 'active' ? (
                        <Pause className="w-4 h-4 text-slate-600" />
                      ) : (
                        <Play className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditTheme(theme)}
                      className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                      title="Edit theme"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteTheme(theme)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Delete theme"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {theme.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{theme.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Deployments:</span>
                    <span className="font-semibold text-slate-900">{theme.deployment_count || 0}</span>
                  </div>

                  {theme.display_types && theme.display_types.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">Display Types:</div>
                      <div className="flex flex-wrap gap-1">
                        {theme.display_types.map((dt) => (
                          <span
                            key={dt.id}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                          >
                            {dt.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => {
                      alert('Theme editor coming soon!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Content
                  </button>
                  <button
                    onClick={() => {
                      alert('Deployment view coming soon!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Routines
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showThemeModal && (
        <ThemeModal
          theme={selectedTheme}
          onClose={() => {
            setShowThemeModal(false);
            setSelectedTheme(null);
          }}
          onSave={() => {
            setShowThemeModal(false);
            setSelectedTheme(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
