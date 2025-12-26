import { useState, useEffect } from 'react';
import { Flame, Eye } from 'lucide-react';

export interface CalorieFormatConfig {
  show_unit: boolean;
  unit_label: 'Cal' | 'cal' | 'Cals' | 'cals' | 'kcal' | 'custom';
  unit_position: 'before' | 'after';
  custom_unit: string;
  thousands_separator: ',' | ' ' | 'none';
  show_decimals: boolean;
  decimal_places: number;
  rounding_mode: 'round' | 'floor' | 'ceil';
}

interface CalorieFormatSettingsProps {
  settings: CalorieFormatConfig;
  onChange: (settings: CalorieFormatConfig) => void;
  onSave: () => void;
}

export default function CalorieFormatSettings({ settings, onChange, onSave }: CalorieFormatSettingsProps) {
  const [localSettings, setLocalSettings] = useState<CalorieFormatConfig>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: keyof CalorieFormatConfig, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onChange(updated);
  };

  const formatPreviewAmount = (amount: number): string => {
    let value = amount;

    switch (localSettings.rounding_mode) {
      case 'floor':
        value = Math.floor(value);
        break;
      case 'ceil':
        value = Math.ceil(value);
        break;
      default:
        value = Math.round(value);
    }

    let formattedValue = '';

    if (localSettings.show_decimals && localSettings.decimal_places > 0) {
      formattedValue = value.toFixed(localSettings.decimal_places);
    } else {
      formattedValue = Math.floor(value).toString();
    }

    if (localSettings.thousands_separator !== 'none') {
      const parts = formattedValue.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, localSettings.thousands_separator);
      formattedValue = parts.join('.');
    }

    if (localSettings.show_unit) {
      const unit = localSettings.unit_label === 'custom' ? localSettings.custom_unit : localSettings.unit_label;
      if (localSettings.unit_position === 'before') {
        formattedValue = unit + ' ' + formattedValue;
      } else {
        formattedValue = formattedValue + ' ' + unit;
      }
    }

    return formattedValue;
  };

  const unitOptions = [
    { value: 'Cal', label: 'Cal (Calories)' },
    { value: 'cal', label: 'cal (lowercase)' },
    { value: 'Cals', label: 'Cals (plural)' },
    { value: 'cals', label: 'cals (plural lowercase)' },
    { value: 'kcal', label: 'kcal (kilocalories)' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-br from-orange-50 to-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-slate-900">Live Preview</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {formatPreviewAmount(150)}
            </div>
            <p className="text-xs text-slate-500">Small Item</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {formatPreviewAmount(850)}
            </div>
            <p className="text-xs text-slate-500">Medium Item</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {formatPreviewAmount(1250)}
            </div>
            <p className="text-xs text-slate-500">Large Item</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-600" />
            Calorie Unit
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors">
              <span className="text-sm text-slate-700">Show Unit Label</span>
              <input
                type="checkbox"
                checked={localSettings.show_unit}
                onChange={(e) => handleChange('show_unit', e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-600"
              />
            </label>

            {localSettings.show_unit && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unit Label
                  </label>
                  <select
                    value={localSettings.unit_label}
                    onChange={(e) => handleChange('unit_label', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    {unitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {localSettings.unit_label === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Custom Unit Label
                    </label>
                    <input
                      type="text"
                      value={localSettings.custom_unit}
                      onChange={(e) => handleChange('custom_unit', e.target.value)}
                      placeholder="e.g., Calories, kCal"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unit Position
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleChange('unit_position', 'before')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.unit_position === 'before'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Before (Cal 150)
                    </button>
                    <button
                      onClick={() => handleChange('unit_position', 'after')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.unit_position === 'after'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      After (150 Cal)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Number Formatting</h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors">
              <span className="text-sm text-slate-700">Show Decimals</span>
              <input
                type="checkbox"
                checked={localSettings.show_decimals}
                onChange={(e) => handleChange('show_decimals', e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-600"
              />
            </label>

            {localSettings.show_decimals && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Decimal Places
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((places) => (
                    <button
                      key={places}
                      onClick={() => handleChange('decimal_places', places)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.decimal_places === places
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {places}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Thousands Separator
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleChange('thousands_separator', ',')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.thousands_separator === ','
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Comma
                </button>
                <button
                  onClick={() => handleChange('thousands_separator', ' ')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.thousands_separator === ' '
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Space
                </button>
                <button
                  onClick={() => handleChange('thousands_separator', 'none')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.thousands_separator === 'none'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  None
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rounding Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleChange('rounding_mode', 'round')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.rounding_mode === 'round'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Round
                </button>
                <button
                  onClick={() => handleChange('rounding_mode', 'floor')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.rounding_mode === 'floor'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Floor
                </button>
                <button
                  onClick={() => handleChange('rounding_mode', 'ceil')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.rounding_mode === 'ceil'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Ceiling
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Round: Normal rounding • Floor: Round down • Ceiling: Round up
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          onClick={onSave}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          Save Calorie Format Settings
        </button>
      </div>
    </div>
  );
}
