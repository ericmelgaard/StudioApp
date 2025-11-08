import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
}

const presetColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B',
  '#1E293B', '#0F172A'
];

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customColor, setCustomColor] = useState(value || '#3B82F6');

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value || '#E5E7EB' }}
          />
          <span className="text-sm text-gray-700">
            {value || 'No color selected'}
          </span>
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        )}
      </div>

      {showPicker && (
        <div className="relative">
          <div className="absolute z-10 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Select a color</span>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-10 gap-2 mb-3">
              {presetColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                    value === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t">
              <label className="text-sm text-gray-600">Custom:</label>
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    onChange(e.target.value);
                  }
                }}
                placeholder="#000000"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
