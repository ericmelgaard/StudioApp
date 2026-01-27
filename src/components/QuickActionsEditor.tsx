import { useState, useEffect } from 'react';
import { X, GripVertical, ChevronUp, ChevronDown, Eye, EyeOff, Save, Monitor, Layers, Activity, Package, Tv, Tag, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuickActionsEditorProps {
  onClose: () => void;
  onSave: (actions: string[]) => void;
  currentActions: string[];
  storeId: number;
}

interface QuickActionDefinition {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description: string;
  color: string;
}

const AVAILABLE_ACTIONS: QuickActionDefinition[] = [
  {
    id: 'devices',
    label: 'Devices',
    icon: Monitor,
    description: 'Total devices and online status',
    color: '#3b82f6'
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: Layers,
    description: 'Placement groups count',
    color: '#06b6d4'
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Activity,
    description: 'Recent actions and updates',
    color: '#8b5cf6'
  },
  {
    id: 'products',
    label: 'Products',
    icon: Package,
    description: 'Product count and status',
    color: '#10b981'
  },
  {
    id: 'signage',
    label: 'Signage',
    icon: Tv,
    description: 'Signage players count',
    color: '#3b82f6'
  },
  {
    id: 'smart_labels',
    label: 'Smart Labels',
    icon: Tag,
    description: 'Smart label players count',
    color: '#f59e0b'
  },
  {
    id: 'webview_kiosks',
    label: 'Webview Kiosks',
    icon: Globe,
    description: 'Webview kiosk count',
    color: '#8b5cf6'
  }
];

export default function QuickActionsEditor({ onClose, onSave, currentActions, storeId }: QuickActionsEditorProps) {
  const [visibleActions, setVisibleActions] = useState<string[]>(currentActions);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const allActions = AVAILABLE_ACTIONS.map(a => a.id);
  const hiddenActions = allActions.filter(id => !visibleActions.includes(id));

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newActions = [...visibleActions];
    [newActions[index - 1], newActions[index]] = [newActions[index], newActions[index - 1]];
    setVisibleActions(newActions);
  };

  const moveDown = (index: number) => {
    if (index === visibleActions.length - 1) return;
    const newActions = [...visibleActions];
    [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
    setVisibleActions(newActions);
  };

  const toggleVisibility = (actionId: string) => {
    if (visibleActions.includes(actionId)) {
      setVisibleActions(visibleActions.filter(id => id !== actionId));
    } else {
      setVisibleActions([...visibleActions, actionId]);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newActions = [...visibleActions];
    const draggedItem = newActions[draggedIndex];

    newActions.splice(draggedIndex, 1);
    newActions.splice(dropIndex, 0, draggedItem);

    setVisibleActions(newActions);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existingPref } = await supabase
        .from('quick_actions_preferences')
        .select('id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (existingPref) {
        await supabase
          .from('quick_actions_preferences')
          .update({ visible_actions: visibleActions })
          .eq('id', existingPref.id);
      } else {
        await supabase
          .from('quick_actions_preferences')
          .insert({
            store_id: storeId,
            visible_actions: visibleActions
          });
      }

      onSave(visibleActions);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const getActionDefinition = (id: string) => AVAILABLE_ACTIONS.find(a => a.id === id)!;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sm:rounded-t-xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Customize Quick Actions</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Show, hide, and reorder your quick action cards</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900 dark:text-slate-100" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Visible Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                Visible Actions ({visibleActions.length})
              </h3>
              <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Drag to reorder or use arrows</span>
            </div>

            {visibleActions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No actions visible. Add some from below!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleActions.map((actionId, index) => {
                  const action = getActionDefinition(actionId);
                  const Icon = action.icon;
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <div
                      key={actionId}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 bg-white dark:bg-slate-700 border-2 rounded-lg p-3 sm:p-4 shadow-sm transition-all cursor-move ${
                        isDragging
                          ? 'opacity-50 scale-95 border-blue-400 dark:border-blue-500'
                          : isDragOver
                          ? 'border-blue-500 dark:border-blue-400 shadow-lg scale-105'
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <GripVertical className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 cursor-grab active:cursor-grabbing" />

                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: action.color + '20' }}
                      >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: action.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{action.label}</p>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">{action.description}</p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className={`p-2 rounded-lg transition-colors ${
                            index === 0
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                          }`}
                        >
                          <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === visibleActions.length - 1}
                          className={`p-2 rounded-lg transition-colors ${
                            index === visibleActions.length - 1
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => toggleVisibility(actionId)}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors ml-1"
                        >
                          <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hidden Actions */}
          {hiddenActions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Hidden Actions ({hiddenActions.length})
                </h3>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Tap to show</span>
              </div>

              <div className="space-y-2">
                {hiddenActions.map(actionId => {
                  const action = getActionDefinition(actionId);
                  const Icon = action.icon;
                  return (
                    <div
                      key={actionId}
                      className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 border-dashed rounded-lg p-3 sm:p-4 opacity-60"
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: action.color + '20' }}
                      >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: action.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{action.label}</p>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">{action.description}</p>
                      </div>

                      <button
                        onClick={() => toggleVisibility(actionId)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sm:rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2.5 sm:py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
