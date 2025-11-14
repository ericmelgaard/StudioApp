import { Link2, Edit3, Calculator, ArrowUp, Calendar, AlertTriangle, CheckCircle, Package, XCircle } from 'lucide-react';

export type BadgeVariant =
  | 'local'
  | 'api'
  | 'calculated'
  | 'parent'
  | 'scheduled'
  | 'warning'
  | 'error'
  | 'inactive'
  | 'out-of-stock'
  | 'synced';

interface StateBadgeProps {
  variant: BadgeVariant;
  text?: string;
  tooltip?: string;
  className?: string;
}

export function StateBadge({ variant, text, tooltip, className = '' }: StateBadgeProps) {
  const badges = {
    local: {
      icon: Edit3,
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      defaultText: 'Custom'
    },
    api: {
      icon: Link2,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      defaultText: 'From API'
    },
    calculated: {
      icon: Calculator,
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      defaultText: 'Calculated'
    },
    parent: {
      icon: ArrowUp,
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      defaultText: 'Inherited'
    },
    scheduled: {
      icon: Calendar,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      defaultText: 'Scheduled'
    },
    warning: {
      icon: AlertTriangle,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      defaultText: 'Warning'
    },
    error: {
      icon: XCircle,
      color: 'bg-red-100 text-red-700 border-red-300',
      defaultText: 'Error'
    },
    inactive: {
      icon: XCircle,
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      defaultText: 'Inactive'
    },
    'out-of-stock': {
      icon: Package,
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      defaultText: 'Out of Stock'
    },
    synced: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700 border-green-300',
      defaultText: 'Synced'
    }
  };

  const config = badges[variant];
  const Icon = config.icon;
  const displayText = text || config.defaultText;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${config.color} ${className}`}
      title={tooltip}
    >
      <Icon className="w-3 h-3" />
      {displayText}
    </span>
  );
}

interface FieldBadgeGroupProps {
  badges: Array<{
    variant: BadgeVariant;
    text?: string;
    tooltip?: string;
  }>;
  className?: string;
}

export function FieldBadgeGroup({ badges, className = '' }: FieldBadgeGroupProps) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {badges.map((badge, index) => (
        <StateBadge
          key={index}
          variant={badge.variant}
          text={badge.text}
          tooltip={badge.tooltip}
        />
      ))}
    </div>
  );
}

interface TimestampBadgeProps {
  timestamp: string;
  prefix?: string;
  className?: string;
}

export function TimestampBadge({ timestamp, prefix = 'Last sync:', className = '' }: TimestampBadgeProps) {
  const formatTimestamp = (ts: string): string => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <span className={`text-xs text-slate-500 ${className}`}>
      {prefix} {formatTimestamp(timestamp)}
    </span>
  );
}
