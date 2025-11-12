import { useState } from 'react';
import { X, Eye, EyeOff, GripVertical, RotateCcw, Pin, PinOff } from 'lucide-react';
import { ColumnDefinition } from '../types/productList';

interface ColumnManagerProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDefinition[];
  onColumnsChange: (columns: ColumnDefinition[]) => void;
}

export default function ColumnManager({
  isOpen,
  onClose,
  columns,
  onColumnsChange
}: ColumnManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;

    const newColumns = [...sortedColumns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    const reordered = newColumns.map((col, idx) => ({
      ...col,
      order: idx
    }));

    onColumnsChange(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const toggleVisibility = (key: string) => {
    const updated = columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updated);
  };

  const togglePin = (key: string) => {
    const updated = columns.map(col =>
      col.key === key ? { ...col, pinned: !col.pinned } : col
    );
    onColumnsChange(updated);
  };

  const showAll = () => {
    const updated = columns.map(col => ({ ...col, visible: true }));
    onColumnsChange(updated);
  };

  const hideAll = () => {
    const updated = columns.map(col =>
      col.key === 'select' || col.key === 'name' ? col : { ...col, visible: false }
    );
    onColumnsChange(updated);
  };

  const resetToDefaults = () => {
    const updated = columns.map(col => {
      const defaultState = {
        ...col,
        visible: ['select', 'name', 'has_image', 'description', 'price', 'calories', 'meal_periods', 'meal_stations', 'integration_source'].includes(col.key),
        pinned: col.key === 'select' || col.key === 'name'
      };
      return defaultState;
    });
    onColumnsChange(updated);
  };

  const visibleCount = columns.filter(c => c.visible).length;
  const totalCount = columns.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Manage Columns</h2>
            <p className="text-sm text-slate-600 mt-1">
              {visibleCount} of {totalCount} columns visible
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <button
            onClick={showAll}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Show All
          </button>
          <button
            onClick={hideAll}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Hide All
          </button>
          <button
            onClick={resetToDefaults}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {sortedColumns.map((column, index) => (
              <div
                key={column.key}
                draggable={column.key !== 'select'}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg transition-all ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${
                  dragOverIndex === index ? 'border-purple-500 bg-purple-50' : 'hover:border-slate-300'
                } ${
                  column.key === 'select' ? 'cursor-not-allowed opacity-60' : 'cursor-move'
                }`}
              >
                {column.key !== 'select' && (
                  <GripVertical className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
                {column.key === 'select' && (
                  <div className="w-5 h-5 flex-shrink-0" />
                )}

                <button
                  onClick={() => togglePin(column.key)}
                  disabled={column.key === 'select'}
                  className={`p-1 rounded transition-colors ${
                    column.pinned
                      ? 'text-purple-600 hover:bg-purple-100'
                      : 'text-slate-400 hover:bg-slate-100'
                  } ${column.key === 'select' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={column.pinned ? 'Unpin column' : 'Pin column'}
                >
                  {column.pinned ? (
                    <Pin className="w-4 h-4" />
                  ) : (
                    <PinOff className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{column.label}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="capitalize">{column.type}</span>
                    {column.pinned && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600">Pinned</span>
                      </>
                    )}
                    {column.sortable && (
                      <>
                        <span>•</span>
                        <span>Sortable</span>
                      </>
                    )}
                    {column.filterable && (
                      <>
                        <span>•</span>
                        <span>Filterable</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    value={column.width}
                    onChange={(e) => {
                      const width = Math.max(50, parseInt(e.target.value) || 100);
                      const updated = columns.map(col =>
                        col.key === column.key ? { ...col, width } : col
                      );
                      onColumnsChange(updated);
                    }}
                    className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Width"
                  />
                  <span className="text-xs text-slate-500">px</span>
                </div>

                <button
                  onClick={() => toggleVisibility(column.key)}
                  disabled={column.key === 'select'}
                  className={`p-2 rounded-lg transition-colors ${
                    column.visible
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  } ${column.key === 'select' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={column.visible ? 'Hide column' : 'Show column'}
                >
                  {column.visible ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            Drag columns to reorder. Pin columns to keep them visible while scrolling.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
