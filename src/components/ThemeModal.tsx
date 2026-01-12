import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Grid3x3, List, Sparkles, Coffee, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Theme {
  id?: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  metadata: Record<string, any>;
}

interface ThemeBoard {
  id?: string;
  display_type_id: string;
  daypart_id: string;
  display_type_name?: string;
  daypart_label?: string;
  daypart_color?: string;
  category?: string;
}

interface DisplayType {
  id: string;
  name: string;
  category: string;
}

interface Daypart {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string;
}

interface ThemeModalProps {
  theme?: Theme | null;
  onClose: () => void;
  onSave: () => void;
  conceptId?: number;
}

export default function ThemeModal({ theme, onClose, onSave, conceptId }: ThemeModalProps) {
  const [formData, setFormData] = useState({
    name: theme?.name || '',
    description: theme?.description || '',
    status: theme?.status || 'draft'
  });
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [dayparts, setDayparts] = useState<Daypart[]>([]);
  const [boards, setBoards] = useState<ThemeBoard[]>([]);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoard, setNewBoard] = useState<{ display_type_id: string; daypart_id: string }>({
    display_type_id: '',
    daypart_id: ''
  });
  const [selectedDayparts, setSelectedDayparts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [conceptId, theme]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadDisplayTypes(), loadDayparts()]);
    if (theme?.id) {
      await loadExistingBoards();
    }
    setLoading(false);
  };

  const loadDisplayTypes = async () => {
    const { data, error } = await supabase
      .from('display_types')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error loading display types:', error);
    } else {
      setDisplayTypes(data || []);
    }
  };

  const loadDayparts = async () => {
    let query = supabase
      .from('daypart_definitions')
      .select('id, daypart_name, display_label, color, icon')
      .eq('is_active', true)
      .is('store_id', null);

    if (conceptId) {
      query = query.or(`concept_id.is.null,concept_id.eq.${conceptId}`);
    } else {
      query = query.is('concept_id', null);
    }

    query = query.order('sort_order');

    const { data, error } = await query;

    if (error) {
      console.error('Error loading dayparts:', error);
    } else {
      setDayparts(data || []);
    }
  };

  const loadExistingBoards = async () => {
    if (!theme?.id) return;

    const { data, error } = await supabase
      .from('theme_boards')
      .select(`
        id,
        display_type_id,
        daypart_id,
        display_types:display_type_id (name, category),
        daypart_definitions:daypart_id (display_label, color)
      `)
      .eq('theme_id', theme.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error loading boards:', error);
      return;
    }

    const loadedBoards = (data || []).map((board: any) => ({
      id: board.id,
      display_type_id: board.display_type_id,
      daypart_id: board.daypart_id,
      display_type_name: board.display_types?.name,
      daypart_label: board.daypart_definitions?.display_label,
      daypart_color: board.daypart_definitions?.color,
      category: board.display_types?.category
    }));

    setBoards(loadedBoards);
  };

  const handleAddBoard = () => {
    if (!newBoard.display_type_id || selectedDayparts.size === 0) {
      alert('Please select a display type and at least one daypart');
      return;
    }

    const displayType = displayTypes.find(dt => dt.id === newBoard.display_type_id);
    if (!displayType) return;

    const newBoards: ThemeBoard[] = [];
    const duplicates: string[] = [];

    selectedDayparts.forEach(daypartId => {
      const isDuplicate = boards.some(
        b => b.display_type_id === newBoard.display_type_id && b.daypart_id === daypartId
      );

      if (isDuplicate) {
        const daypart = dayparts.find(dp => dp.id === daypartId);
        if (daypart) duplicates.push(daypart.display_label);
      } else {
        const daypart = dayparts.find(dp => dp.id === daypartId);
        if (daypart) {
          newBoards.push({
            display_type_id: newBoard.display_type_id,
            daypart_id: daypartId,
            display_type_name: displayType.name,
            daypart_label: daypart.display_label,
            daypart_color: daypart.color,
            category: displayType.category
          });
        }
      }
    });

    if (duplicates.length > 0) {
      alert(`Skipped duplicate boards: ${duplicates.join(', ')}`);
    }

    if (newBoards.length > 0) {
      setBoards([...boards, ...newBoards]);
    }

    setNewBoard({ display_type_id: '', daypart_id: '' });
    setSelectedDayparts(new Set());
    setAddingBoard(false);
  };

  const handleToggleDaypart = (daypartId: string) => {
    const newSelected = new Set(selectedDayparts);
    if (newSelected.has(daypartId)) {
      newSelected.delete(daypartId);
    } else {
      newSelected.add(daypartId);
    }
    setSelectedDayparts(newSelected);
  };

  const handleSelectAllDayparts = () => {
    setSelectedDayparts(new Set(dayparts.map(dp => dp.id)));
  };

  const handleClearDayparts = () => {
    setSelectedDayparts(new Set());
  };

  const applyTemplate = (template: 'all' | 'meals' | 'business') => {
    if (!newBoard.display_type_id) {
      alert('Please select a display type first');
      return;
    }

    let templateDayparts: string[] = [];

    switch (template) {
      case 'all':
        templateDayparts = dayparts.map(dp => dp.id);
        break;
      case 'meals':
        const mealNames = ['breakfast', 'lunch', 'dinner'];
        templateDayparts = dayparts
          .filter(dp => mealNames.some(name => dp.daypart_name.toLowerCase().includes(name)))
          .map(dp => dp.id);
        break;
      case 'business':
        const businessNames = ['opening', 'peak', 'closing', 'morning', 'afternoon', 'evening'];
        templateDayparts = dayparts
          .filter(dp => businessNames.some(name => dp.daypart_name.toLowerCase().includes(name)))
          .map(dp => dp.id);
        break;
    }

    setSelectedDayparts(new Set(templateDayparts));
  };

  const handleRemoveBoard = (index: number) => {
    setBoards(boards.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (boards.length === 0) {
      alert('Please add at least one board');
      return;
    }

    setSaving(true);

    try {
      let themeId = theme?.id;

      if (themeId) {
        const { error: updateError } = await supabase
          .from('themes')
          .update({
            name: formData.name,
            description: formData.description || null,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', themeId);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('theme_boards')
          .delete()
          .eq('theme_id', themeId);

        if (deleteError) throw deleteError;
      } else {
        const { data: newTheme, error: insertError } = await supabase
          .from('themes')
          .insert({
            name: formData.name,
            description: formData.description || null,
            status: formData.status,
            metadata: {},
            concept_id: conceptId || null
          })
          .select()
          .single();

        if (insertError) throw insertError;
        themeId = newTheme.id;
      }

      const boardsData = boards.map(board => ({
        theme_id: themeId,
        display_type_id: board.display_type_id,
        daypart_id: board.daypart_id,
        layout_config: { type: 'full_display', width: '100%', height: '100%' },
        status: 'active'
      }));

      const { error: boardsError } = await supabase
        .from('theme_boards')
        .insert(boardsData);

      if (boardsError) throw boardsError;

      onSave();
    } catch (error: any) {
      console.error('Error saving theme:', error);
      alert(`Failed to save theme: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'digital_signage':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'esl':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'print':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'social_media':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {theme ? 'Edit Theme' : 'New Campaign'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-900">Properties</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  CAMPAIGN NAME
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="0/64"
                  maxLength={64}
                  required
                />
                <div className="text-xs text-slate-400 mt-1">{formData.name.length}/64</div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  DESCRIPTION <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="0/512"
                  maxLength={512}
                  rows={2}
                />
                <div className="text-xs text-slate-400 mt-1">{formData.description.length}/512</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-slate-900">Boards</h3>
                {boards.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                    {boards.length} configured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Grid view"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setAddingBoard(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  ADD BOARD
                </button>
              </div>
            </div>

            {boards.length === 0 && !addingBoard ? (
              <div className="border border-slate-200 rounded-lg p-12 text-center bg-slate-50">
                <div className="text-sm text-slate-500">
                  No boards yet.{' '}
                  <button
                    type="button"
                    onClick={() => setAddingBoard(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add a board
                  </button>
                  {' '}that will be used in this campaign.
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-3 gap-3">
                {boards.map((board, index) => (
                  <div
                    key={index}
                    className="group relative bg-white border-2 rounded-lg p-3 hover:shadow-md transition-all"
                    style={{ borderColor: board.daypart_color }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveBoard(index)}
                      className="absolute top-2 right-2 p-1 bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: board.daypart_color }}
                        />
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {board.daypart_label}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {board.display_type_name}
                      </div>
                      {board.category && (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded border ${getCategoryColor(board.category)}`}>
                          {board.category.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-2 uppercase">Display Type</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-2 uppercase">Category</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-2 uppercase">Daypart</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {boards.map((board, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900 font-medium">{board.display_type_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          {board.category && (
                            <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(board.category)}`}>
                              {board.category.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: board.daypart_color }}
                            />
                            <span className="text-sm text-slate-900">{board.daypart_label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveBoard(index)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {addingBoard && (
              <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Add New Board</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingBoard(false);
                      setNewBoard({ display_type_id: '', daypart_id: '' });
                      setSelectedDayparts(new Set());
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    DISPLAY TYPE
                  </label>
                  <select
                    value={newBoard.display_type_id}
                    onChange={(e) => setNewBoard({ ...newBoard, display_type_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Display Type</option>
                    {displayTypes.map(dt => (
                      <option key={dt.id} value={dt.id}>
                        {dt.name} - {dt.category.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-700">
                      DAYPARTS {selectedDayparts.size > 0 && (
                        <span className="text-blue-600">({selectedDayparts.size} selected)</span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllDayparts}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Select All
                      </button>
                      {selectedDayparts.size > 0 && (
                        <button
                          type="button"
                          onClick={handleClearDayparts}
                          className="text-xs text-slate-600 hover:text-slate-700 font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {dayparts.map(dp => (
                      <button
                        key={dp.id}
                        type="button"
                        onClick={() => handleToggleDaypart(dp.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          selectedDayparts.has(dp.id)
                            ? 'border-current shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                        style={
                          selectedDayparts.has(dp.id)
                            ? { borderColor: dp.color, backgroundColor: dp.color + '20', color: dp.color }
                            : {}
                        }
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: dp.color }}
                        />
                        {dp.display_label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                    <span className="text-xs text-slate-600">Quick Templates:</span>
                    <button
                      type="button"
                      onClick={() => applyTemplate('all')}
                      className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      All Dayparts
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('meals')}
                      className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Coffee className="w-3 h-3" />
                      Meal Periods
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('business')}
                      className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      Business Hours
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingBoard(false);
                      setNewBoard({ display_type_id: '', daypart_id: '' });
                      setSelectedDayparts(new Set());
                    }}
                    className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBoard}
                    disabled={!newBoard.display_type_id || selectedDayparts.size === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Add {selectedDayparts.size > 0 && `(${selectedDayparts.size})`} Board{selectedDayparts.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="rounded" />
              Add another campaign
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                DISCARD
              </button>
              <button
                type="submit"
                disabled={saving || !formData.name || boards.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {saving ? 'SAVING...' : 'ADD'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
