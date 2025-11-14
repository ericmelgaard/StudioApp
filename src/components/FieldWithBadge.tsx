import { RefreshCw, Edit3, Scissors, Eye, Calculator as CalculatorIcon } from 'lucide-react';
import { StateBadge, TimestampBadge, FieldBadgeGroup } from './StateBadge';
import { ResolvedValue } from '../lib/productValueResolver';

interface FieldWithBadgeProps {
  label: string;
  value: any;
  resolvedValue?: ResolvedValue;
  onChange?: (value: any) => void;
  onRevertToAPI?: () => void;
  onEnableOverride?: () => void;
  onRefresh?: () => void;
  onViewFormula?: () => void;
  disabled?: boolean;
  type?: 'text' | 'number' | 'textarea';
  className?: string;
}

export function FieldWithBadge({
  label,
  value,
  resolvedValue,
  onChange,
  onRevertToAPI,
  onEnableOverride,
  onRefresh,
  onViewFormula,
  disabled = false,
  type = 'text',
  className = ''
}: FieldWithBadgeProps) {
  const isLocal = resolvedValue?.source === 'local';
  const isAPI = resolvedValue?.source === 'api';
  const isCalculated = resolvedValue?.source === 'calculated';
  const isParent = resolvedValue?.source === 'parent';

  const badges = [];
  if (isLocal) {
    badges.push({ variant: 'local' as const, text: 'Custom' });
  }
  if (isAPI) {
    badges.push({
      variant: 'api' as const,
      text: 'From API',
      tooltip: `Mapping ID: ${resolvedValue.details?.apiMappingId}`
    });
  }
  if (isCalculated) {
    badges.push({ variant: 'calculated' as const, text: 'Calculated' });
  }
  if (isParent) {
    badges.push({ variant: 'parent' as const, text: 'Inherited' });
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <FieldBadgeGroup badges={badges} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          {type === 'textarea' ? (
            <textarea
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled || (isAPI && !isLocal)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              rows={3}
            />
          ) : (
            <input
              type={type}
              value={value || ''}
              onChange={(e) => onChange?.(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              disabled={disabled || (isAPI && !isLocal)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {isLocal && onRevertToAPI && (
            <button
              onClick={onRevertToAPI}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Revert to API value"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {isAPI && onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh from API"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {isAPI && onEnableOverride && (
            <button
              onClick={onEnableOverride}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              title="Override with custom value"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {isCalculated && onViewFormula && (
            <button
              onClick={onViewFormula}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="View calculation formula"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isAPI && resolvedValue?.details?.lastSyncedAt && (
        <TimestampBadge timestamp={resolvedValue.details.lastSyncedAt} />
      )}

      {isCalculated && resolvedValue?.details?.calculationFormula && (
        <div className="text-xs text-slate-500">
          Formula applied
        </div>
      )}
    </div>
  );
}

interface OptionFieldWithBadgeProps {
  option: {
    id: string;
    label: string;
    price: number;
    is_active: boolean;
    is_out_of_stock: boolean;
    link?: any;
  };
  onUpdateOption: (id: string, updates: any) => void;
  onLinkOption: (optionId: string) => void;
  onUnlinkOption: (optionId: string) => void;
  onRemoveOption: (id: string) => void;
  onViewFormula?: (optionId: string) => void;
  onClearOverride?: (optionId: string) => void;
  parentIntegrationSourceId?: string | null;
}

export function OptionFieldWithBadge({
  option,
  onUpdateOption,
  onLinkOption,
  onUnlinkOption,
  onRemoveOption,
  onViewFormula,
  onClearOverride,
  parentIntegrationSourceId
}: OptionFieldWithBadgeProps) {
  const hasLink = !!option.link;
  const isCalculated = option.link?.type === 'calculation';
  const hasOverride = option.link?.override;

  const badges = [];
  if (hasLink && !isCalculated) {
    badges.push({ variant: 'api' as const, text: 'From API' });
  }
  if (isCalculated && !hasOverride) {
    badges.push({ variant: 'calculated' as const, text: 'Calculated' });
  }
  if (hasOverride) {
    badges.push({
      variant: 'local' as const,
      text: `Fixed (Formula: $${option.link?.calculated_result?.toFixed(2) || '0.00'})`
    });
  }
  if (!option.is_active) {
    badges.push({ variant: 'inactive' as const, text: 'Inactive' });
  }
  if (option.is_out_of_stock) {
    badges.push({ variant: 'out-of-stock' as const, text: 'Out of Stock' });
  }

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={option.label}
              onChange={(e) => onUpdateOption(option.id, { label: e.target.value })}
              placeholder="Option label"
              disabled={hasLink && !isCalculated}
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={option.price}
                onChange={(e) => onUpdateOption(option.id, { price: parseFloat(e.target.value) || 0 })}
                disabled={hasLink && !hasOverride}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateOption(option.id, { is_active: !option.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  option.is_active ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                title="Toggle active"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    option.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

              <button
                onClick={() => onUpdateOption(option.id, { is_out_of_stock: !option.is_out_of_stock })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  option.is_out_of_stock ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                title="Toggle out of stock"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    option.is_out_of_stock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <FieldBadgeGroup badges={badges} />
        </div>

        <button
          onClick={() => onRemoveOption(option.id)}
          className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove option"
        >
          <Scissors className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {!hasLink && parentIntegrationSourceId && (
          <button
            onClick={() => onLinkOption(option.id)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Link to API
          </button>
        )}

        {hasLink && !isCalculated && (
          <>
            <button
              onClick={() => onUnlinkOption(option.id)}
              className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Unlink
            </button>
            <button
              onClick={() => onUpdateOption(option.id, {})}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Refresh
            </button>
          </>
        )}

        {isCalculated && (
          <>
            {onViewFormula && (
              <button
                onClick={() => onViewFormula(option.id)}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Eye className="w-3 h-3 inline mr-1" />
                View Formula
              </button>
            )}
            {hasOverride && onClearOverride && (
              <button
                onClick={() => onClearOverride(option.id)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Use Calculated Price
              </button>
            )}
            {!hasOverride && (
              <button
                onClick={() => onUpdateOption(option.id, { link: { ...option.link, override: true } })}
                className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Convert to Fixed
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
