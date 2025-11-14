import { Link, Database, RefreshCw, AlertCircle } from 'lucide-react';

interface ProductIntegrationBadgeProps {
  isLinked: boolean;
  integrationSourceName?: string;
  hasActiveMappings: boolean;
  hasMixedMappings?: boolean;
  mappedFieldCount?: number;
  totalFieldCount?: number;
  onClick?: () => void;
  className?: string;
}

export default function ProductIntegrationBadge({
  isLinked,
  integrationSourceName,
  hasActiveMappings,
  hasMixedMappings = false,
  mappedFieldCount = 0,
  totalFieldCount = 0,
  onClick,
  className = ''
}: ProductIntegrationBadgeProps) {
  if (!isLinked && !hasActiveMappings) return null;

  const getStatusColor = () => {
    if (!isLinked) return 'blue';
    if (hasMixedMappings) return 'amber';
    return 'green';
  };

  const getStatusText = () => {
    if (!isLinked) return 'Mappings Available';
    if (hasMixedMappings) return 'Partially Synced';
    return 'Fully Synced';
  };

  const getIcon = () => {
    if (!isLinked) return <Database className="w-4 h-4" />;
    if (hasMixedMappings) return <AlertCircle className="w-4 h-4" />;
    return <Link className="w-4 h-4" />;
  };

  const color = getStatusColor();
  const statusText = getStatusText();
  const icon = getIcon();

  const bgColors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const hoverColors = {
    green: 'hover:bg-green-100',
    amber: 'hover:bg-amber-100',
    blue: 'hover:bg-blue-100'
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border font-medium text-sm transition-colors ${
        bgColors[color]
      } ${onClick ? hoverColors[color] : ''} ${className}`}
    >
      {icon}
      <div className="flex flex-col items-start">
        <span className="text-xs font-semibold">{statusText}</span>
        {integrationSourceName && (
          <span className="text-xs opacity-80">{integrationSourceName}</span>
        )}
        {mappedFieldCount > 0 && totalFieldCount > 0 && (
          <span className="text-xs opacity-75">
            {mappedFieldCount}/{totalFieldCount} fields
          </span>
        )}
      </div>
      {isLinked && (
        <div className="ml-1">
          <RefreshCw className="w-3 h-3 animate-spin-slow" />
        </div>
      )}
    </Component>
  );
}

export function ProductIntegrationStatusBar({
  isLinked,
  integrationSourceName,
  hasActiveMappings,
  syncedFieldsCount = 0,
  localFieldsCount = 0,
  onManageSync,
  onChangeSource,
  className = ''
}: {
  isLinked: boolean;
  integrationSourceName?: string;
  hasActiveMappings: boolean;
  syncedFieldsCount?: number;
  localFieldsCount?: number;
  onManageSync?: () => void;
  onChangeSource?: () => void;
  className?: string;
}) {
  if (!isLinked && !hasActiveMappings) return null;

  return (
    <div className={`flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <Database className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {isLinked ? 'Integration Product Linked' : 'Integration Mappings Available'}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {integrationSourceName && <span className="font-medium">{integrationSourceName}</span>}
            {syncedFieldsCount > 0 && (
              <span className="ml-2">
                {syncedFieldsCount} synced, {localFieldsCount} local
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onManageSync && (
          <button
            onClick={onManageSync}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Manage Sync
          </button>
        )}
        {onChangeSource && (
          <button
            onClick={onChangeSource}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Change Source
          </button>
        )}
      </div>
    </div>
  );
}
