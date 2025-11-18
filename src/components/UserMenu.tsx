import { useState } from 'react';
import { User, LogOut } from 'lucide-react';

interface UserMenuProps {
  role: string;
  onBackToRoles: () => void;
}

export default function UserMenu({ role, onBackToRoles }: UserMenuProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getInitials = (roleName: string) => {
    return roleName.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'operator':
        return 'Store Operator';
      case 'creator':
        return 'Content Creator';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'rgba(222, 56, 222, 1)';
      default:
        return 'linear-gradient(to bottom right, #10b981, #059669)';
    }
  };

  const roleDisplay = getRoleDisplay(role);
  const email = 'demo.user@wanddigital.com';

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
          style={{ background: getRoleColor(role) }}
        >
          {getInitials(roleDisplay)}
        </div>
        <svg
          className="w-4 h-4 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: getRoleColor(role) }}
                >
                  {getInitials(roleDisplay)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{roleDisplay}</h3>
                  <p className="text-sm text-slate-600 truncate">{email}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onBackToRoles();
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Roles</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
