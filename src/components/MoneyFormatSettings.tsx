import { useState, useEffect } from 'react';
import { DollarSign, Eye } from 'lucide-react';

export interface MoneyFormatConfig {
  show_currency_symbol: boolean;
  currency_symbol: string;
  symbol_position: 'before' | 'after';
  symbol_style: 'normal' | 'superscript';
  decimal_places: number;
  show_cents: boolean;
  thousands_separator: ',' | ' ' | 'none';
  decimal_separator: '.' | ',';
  rounding_mode: 'round' | 'floor' | 'ceil';
}

interface MoneyFormatSettingsProps {
  settings: MoneyFormatConfig;
  onChange: (settings: MoneyFormatConfig) => void;
  onSave: () => void;
}

export default function MoneyFormatSettings({ settings, onChange, onSave }: MoneyFormatSettingsProps) {
  const [localSettings, setLocalSettings] = useState<MoneyFormatConfig>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: keyof MoneyFormatConfig, value: any) => {
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
        value = Math.round(value * 100) / 100;
    }

    const integerPart = Math.floor(value);
    const decimalPart = Math.round((value - integerPart) * 100);

    let integerStr = integerPart.toString();
    if (localSettings.thousands_separator !== 'none') {
      integerStr = integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, localSettings.thousands_separator);
    }

    let formattedValue = integerStr;

    if (localSettings.show_cents && localSettings.decimal_places > 0) {
      const cents = decimalPart.toString().padStart(2, '0');
      formattedValue += localSettings.decimal_separator + cents;
    }

    if (localSettings.show_currency_symbol) {
      const symbol = localSettings.currency_symbol;
      if (localSettings.symbol_position === 'before') {
        formattedValue = symbol + formattedValue;
      } else {
        formattedValue = formattedValue + symbol;
      }
    }

    return formattedValue;
  };

  const renderPreview = (amount: number) => {
    const formatted = formatPreviewAmount(amount);

    if (localSettings.show_currency_symbol && localSettings.symbol_style === 'superscript') {
      const parts = formatted.split(localSettings.currency_symbol);
      if (localSettings.symbol_position === 'before') {
        return (
          <>
            <sup className="text-xl font-semibold">{localSettings.currency_symbol}</sup>
            <span>{parts[1]}</span>
          </>
        );
      } else {
        return (
          <>
            <span>{parts[0]}</span>
            <sup className="text-xl font-semibold">{localSettings.currency_symbol}</sup>
          </>
        );
      }
    }

    return <span>{formatted}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-[#00adf0]" />
          <h3 className="font-semibold text-slate-900">Live Preview</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {renderPreview(9.99)}
            </div>
            <p className="text-xs text-slate-500">Small Amount</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {renderPreview(1234.56)}
            </div>
            <p className="text-xs text-slate-500">Medium Amount</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {renderPreview(9876543.21)}
            </div>
            <p className="text-xs text-slate-500">Large Amount</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#00adf0]" />
            Currency Symbol
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors">
              <span className="text-sm text-slate-700">Show Currency Symbol</span>
              <input
                type="checkbox"
                checked={localSettings.show_currency_symbol}
                onChange={(e) => handleChange('show_currency_symbol', e.target.checked)}
                className="w-4 h-4 text-[#00adf0] rounded focus:ring-2 focus:ring-[#00adf0]"
              />
            </label>

            {localSettings.show_currency_symbol && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={localSettings.currency_symbol}
                    onChange={(e) => handleChange('currency_symbol', e.target.value)}
                    maxLength={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00adf0]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Symbol Position
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleChange('symbol_position', 'before')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.symbol_position === 'before'
                          ? 'bg-[#00adf0] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Before ($100)
                    </button>
                    <button
                      onClick={() => handleChange('symbol_position', 'after')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.symbol_position === 'after'
                          ? 'bg-[#00adf0] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      After (100$)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Symbol Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleChange('symbol_style', 'normal')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.symbol_style === 'normal'
                          ? 'bg-[#00adf0] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => handleChange('symbol_style', 'superscript')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.symbol_style === 'superscript'
                          ? 'bg-[#00adf0] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Superscript
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Decimal & Formatting</h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors">
              <span className="text-sm text-slate-700">Show Cents/Decimals</span>
              <input
                type="checkbox"
                checked={localSettings.show_cents}
                onChange={(e) => handleChange('show_cents', e.target.checked)}
                className="w-4 h-4 text-[#00adf0] rounded focus:ring-2 focus:ring-[#00adf0]"
              />
            </label>

            {localSettings.show_cents && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Decimal Places
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 2, 3].map((places) => (
                    <button
                      key={places}
                      onClick={() => handleChange('decimal_places', places)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localSettings.decimal_places === places
                          ? 'bg-[#00adf0] text-white'
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
                      ? 'bg-[#00adf0] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Comma
                </button>
                <button
                  onClick={() => handleChange('thousands_separator', ' ')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.thousands_separator === ' '
                      ? 'bg-[#00adf0] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Space
                </button>
                <button
                  onClick={() => handleChange('thousands_separator', 'none')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.thousands_separator === 'none'
                      ? 'bg-[#00adf0] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  None
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Decimal Separator
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleChange('decimal_separator', '.')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.decimal_separator === '.'
                      ? 'bg-[#00adf0] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Period (.)
                </button>
                <button
                  onClick={() => handleChange('decimal_separator', ',')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.decimal_separator === ','
                      ? 'bg-[#00adf0] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Comma (,)
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
                      ? 'bg-[#00adf0] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Round
                </button>
                <button
                  onClick={() => handleChange('rounding_mode', 'floor')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.rounding_mode === 'floor'
                      ? 'bg-[#00adf0] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Floor
                </button>
                <button
                  onClick={() => handleChange('rounding_mode', 'ceil')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localSettings.rounding_mode === 'ceil'
                      ? 'bg-[#00adf0] text-white'
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
          className="px-6 py-2 bg-[#00adf0] text-white rounded-lg hover:bg-[#0099d6] transition-colors font-medium"
        >
          Save Money Format Settings
        </button>
      </div>
    </div>
  );
}
