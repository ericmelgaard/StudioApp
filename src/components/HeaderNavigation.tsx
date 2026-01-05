import { Map } from 'lucide-react';
import QuickLocationNav from './QuickLocationNav';

interface HeaderNavigationProps {
  userConceptId?: number | null;
  userCompanyId?: number | null;
  userStoreId?: number | null;
  onOpenFullNavigator: () => void;
  actionButton?: React.ReactNode;
}

export default function HeaderNavigation({
  userConceptId,
  userCompanyId,
  userStoreId,
  onOpenFullNavigator,
  actionButton
}: HeaderNavigationProps) {
  return (
    <div className="flex items-center gap-2">
      <QuickLocationNav
        userConceptId={userConceptId}
        userCompanyId={userCompanyId}
        userStoreId={userStoreId}
      />

      <button
        onClick={onOpenFullNavigator}
        className="hidden md:flex items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        title="Open full location map"
      >
        <Map className="w-4 h-4 text-slate-600" />
      </button>

      {actionButton && actionButton}
    </div>
  );
}
