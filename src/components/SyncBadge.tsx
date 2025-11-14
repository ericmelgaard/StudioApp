import { Link, Unlink, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';

export type SyncState =
  | 'linked-active'
  | 'linked-inactive'
  | 'inheriting'
  | 'locally-applied'
  | 'none';

export interface SyncBadgeProps {
  state: SyncState;
  mappedTo?: string;
  inheritedFrom?: string;
  apiSource?: string;
  isActive?: boolean;
  canSync?: boolean;
  onClick?: () => void;
  onRevert?: () => void;
  className?: string;
}

export default function SyncBadge({
  state,
  mappedTo,
  inheritedFrom,
  apiSource,
  isActive = false,
  canSync = false,
  onClick,
  onRevert,
  className = ''
}: SyncBadgeProps) {
  if (state === 'none') return null;

  const renderBadge = () => {
    switch (state) {
      case 'linked-active':
        return (
          <button
            onClick={onClick}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 ${className}`}
            title={`Synced from ${apiSource || 'API'}${mappedTo ? `: ${mappedTo}` : ''}\nClick to modify`}
          >
            <Link className="w-3 h-3" />
            <span>Synced</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>
        );

      case 'linked-inactive':
        return (
          <button
            onClick={onClick}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 ${className}`}
            title={`Sync available from ${apiSource || 'API'}${mappedTo ? `: ${mappedTo}` : ''}\nClick to activate`}
          >
            <Unlink className="w-3 h-3" />
            <span>Can Sync</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>
        );

      case 'inheriting':
        return (
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 ${className}`}
            title={inheritedFrom ? `Inherited from ${inheritedFrom}` : 'Inherited value'}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Inherited</span>
          </div>
        );

      case 'locally-applied':
        return (
          <div className={`relative ${className}`}>
            <button
              onClick={onClick}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              title={`Local override${canSync ? '\nClick to revert to synced value' : ''}`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Local</span>
              {canSync && <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return renderBadge();
}

export function InheritedIndicator({ source, className = '' }: { source?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-1 text-xs text-slate-500 ${className}`}>
      <RefreshCw className="w-3 h-3" />
      <span>Inherited{source ? ` from ${source}` : ''}</span>
    </div>
  );
}

export function LocallyAppliedIndicator({
  onRevert,
  canRevert = true,
  className = ''
}: {
  onRevert?: () => void;
  canRevert?: boolean;
  className?: string;
}) {
  if (!canRevert) {
    return (
      <div className={`text-xs text-amber-600 font-medium ${className}`}>
        Locally applied
      </div>
    );
  }

  return (
    <button
      onClick={onRevert}
      className={`text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline ${className}`}
      title="Click to revert to inherited value"
    >
      Locally applied (revert)
    </button>
  );
}
