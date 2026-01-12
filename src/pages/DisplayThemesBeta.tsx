import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Monitor, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ThemeModal from '../components/ThemeModal';
import PlacementRoutineModal from '../components/PlacementRoutineModal';

interface Theme {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  metadata: Record<string, any>;
  concept_id: number | null;
  display_type_ids: string[] | null;
  daypart_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

interface DisplayType {
  id: string;
  name: string;
  category: string;
}

interface Daypart {
  id: string;
  display_label: string;
}

interface ThemeWithStats extends Theme {
  deployment_count?: number;
  display_types?: DisplayType[];
  dayparts?: Daypart[];
}

interface DisplayThemesBetaProps {
  onBack?: () => void;
  onEditContent?: (themeId: string, themeName: string) => void;
  conceptId?: number;
}

export default function DisplayThemesBeta({ onBack, onEditContent, conceptId }: DisplayThemesBetaProps) {
  const [themes, setThemes] = useState<ThemeWithStats[]>([]);
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineTheme, setRoutineTheme] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [conceptId]);

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

        let displayTypes: DisplayType[] = [];
        if (theme.display_type_ids && theme.display_type_ids.length > 0) {
          const { data: dtData } = await supabase
            .from('display_types')
            .select('id, name, category')
            .in('id', theme.display_type_ids);
          displayTypes = dtData || [];
        }

        let dayparts: Daypart[] = [];
        if (theme.daypart_ids && theme.daypart_ids.length > 0) {
          const { data: dpData } = await supabase
            .from('daypart_definitions')
            .select('id, display_label')
            .in('id', theme.daypart_ids);
          dayparts = dpData || [];
        }

        return {
          ...theme,
          deployment_count: count || 0,
          display_types: displayTypes,
          dayparts: dayparts
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

  const handleEditContent = (theme: ThemeWithStats) => {
    if (!theme.display_type_ids || theme.display_type_ids.length === 0 ||
        !theme.daypart_ids || theme.daypart_ids.length === 0) {
      alert('Please configure the theme schema (display types and dayparts) before editing content.');
      return;
    }

    if (onEditContent) {
      onEditContent(theme.id, theme.name);
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

  const hasSchemaIssues = (theme: ThemeWithStats) => {
    return !theme.display_type_ids || theme.display_type_ids.length === 0 ||
           !theme.daypart_ids || theme.daypart_ids.length === 0;
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
        <div className="space-y-3">
          {filteredThemes.map((theme) => (
            <div
              key={theme.id}
              className={`bg-white rounded-lg shadow-sm border transition-shadow ${
                hasSchemaIssues(theme) ? 'border-amber-300' : 'border-slate-200'
              } hover:shadow-md`}
            >
              <div className="p-5">
                {hasSchemaIssues(theme) && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700">
                      Schema not configured. Edit theme to set display types and dayparts.
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleStatus(theme)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      theme.status === 'active' ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                    title={theme.status === 'active' ? 'Deactivate theme' : 'Activate theme'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900 text-lg">{theme.name}</h3>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusColor(theme.status)}`}>
                        {theme.status}
                      </span>
                    </div>
                    {theme.description && (
                      <p className="text-sm text-slate-600 line-clamp-1">{theme.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-slate-500 text-xs">Deployments</div>
                      <div className="font-semibold text-slate-900 text-lg">{theme.deployment_count || 0}</div>
                    </div>

                    {theme.display_types && theme.display_types.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Display Types</div>
                        <div className="flex flex-wrap gap-1">
                          {theme.display_types.slice(0, 2).map((dt) => (
                            <span
                              key={dt.id}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                            >
                              {dt.name}
                            </span>
                          ))}
                          {theme.display_types.length > 2 && (
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                              +{theme.display_types.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {theme.dayparts && theme.dayparts.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Dayparts</div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded font-medium">
                            {theme.dayparts.length} configured
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditContent(theme)}
                      disabled={hasSchemaIssues(theme)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        hasSchemaIssues(theme)
                          ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                          : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                      }`}
                      title={hasSchemaIssues(theme) ? 'Configure schema first' : 'Edit theme content'}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Content
                    </button>
                    <button
                      onClick={() => {
                        setRoutineTheme({ id: theme.id, name: theme.name });
                        setShowRoutineModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      Routines
                    </button>
                    <button
                      onClick={() => handleEditTheme(theme)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit theme settings"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteTheme(theme)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete theme"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showThemeModal && (
        <ThemeModal
          theme={selectedTheme}
          conceptId={conceptId}
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

      {showRoutineModal && routineTheme && (
        <PlacementRoutineModal
          themeId={routineTheme.id}
          themeName={routineTheme.name}
          onClose={() => {
            setShowRoutineModal(false);
            setRoutineTheme(null);
          }}
          onSave={() => {
            setShowRoutineModal(false);
            setRoutineTheme(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
