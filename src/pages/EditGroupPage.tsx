import { useState, useEffect } from 'react';
import {
  ArrowLeft, AlertCircle, Monitor,
  Calendar, ChevronRight, Palette, Flame, Pizza, Coffee,
  Zap, Wrench, Utensils, DoorOpen, Sunrise, IceCream, Wine, Pencil, Check, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditGroupPageProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    templates?: any;
  };
  storeId: number;
  onBack: () => void;
  onNavigateToSchedules: () => void;
  onNavigateToDevices: () => void;
}

interface Theme {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  status: string;
}

const getIconComponent = (iconName: string | null) => {
  const iconMap: { [key: string]: any } = {
    flame: Flame,
    pizza: Pizza,
    coffee: Coffee,
    zap: Zap,
    wrench: Wrench,
    utensils: Utensils,
    'utensils-crossed': Utensils,
    'door-open': DoorOpen,
    sunrise: Sunrise,
    'ice-cream': IceCream,
    wine: Wine,
    taco: Utensils,
    italian: Pizza
  };
  return iconMap[iconName || ''] || Palette;
};

export default function EditGroupPage({
  group,
  storeId,
  onBack,
  onNavigateToSchedules,
  onNavigateToDevices
}: EditGroupPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group.name);

  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(group.templates?.theme_id || null);
  const [loadingThemes, setLoadingThemes] = useState(false);

  useEffect(() => {
    setEditedName(group.name);
    loadThemes();
  }, [group.id, group.name, storeId]);

  const loadThemes = async () => {
    setLoadingThemes(true);
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('id, name, description, icon, icon_url, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setThemes(data || []);
    } catch (err) {
      console.error('Error loading themes:', err);
    } finally {
      setLoadingThemes(false);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      setError('Group name cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('placement_groups')
        .update({ name: editedName.trim() })
        .eq('id', group.id);

      if (error) throw error;

      setIsEditingName(false);
      setSuccess('Name updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error updating group name:', err);
      setError('Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(group.name);
    setIsEditingName(false);
    setError(null);
  };

  const handleUpdateTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    setError(null);

    try {
      const { error } = await supabase
        .from('placement_groups')
        .update({
          templates: {
            ...group.templates,
            theme_id: themeId
          }
        })
        .eq('id', group.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating theme:', err);
      setError('Failed to update theme');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 text-lg font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={loading || !editedName.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg flex-shrink-0"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg flex-shrink-0"
                >
                  <X className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{editedName}</h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto pb-20">
        {error && (
          <div className="p-4">
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <div className="p-4 space-y-4">
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTheme && themes.find(t => t.id === selectedTheme)
                    ? `Theme: ${themes.find(t => t.id === selectedTheme)?.name}`
                    : 'Theme'}
                </h2>
              </div>
            </div>

            {loadingThemes ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : themes.length === 0 ? (
              <div className="text-center py-8 mx-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <Palette className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No themes available</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-0 border-t border-slate-200 dark:border-slate-700">
                {themes.map((theme) => {
                  const IconComponent = getIconComponent(theme.icon);
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleUpdateTheme(selectedTheme === theme.id ? '' : theme.id)}
                      className={`flex flex-col items-center gap-1 p-3 transition-all border-r border-b border-slate-200 dark:border-slate-700 ${
                        selectedTheme === theme.id
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${
                        selectedTheme === theme.id
                          ? 'bg-blue-500'
                          : 'bg-slate-100 dark:bg-slate-700'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          selectedTheme === theme.id
                            ? 'text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`} />
                      </div>
                      <span className={`text-[10px] font-medium text-center line-clamp-2 max-w-full leading-tight ${
                        selectedTheme === theme.id
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {theme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Schedules</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage theme rotation schedules</p>
            </div>

            <button
              onClick={onNavigateToSchedules}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              Manage Schedules
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Displays</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage displays assigned to this group</p>
            </div>

            <button
              onClick={onNavigateToDevices}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Monitor className="w-4 h-4" />
              Manage Displays
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
