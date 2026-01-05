import { X, Home, Monitor, Tag, Package, Store } from 'lucide-react';

interface OperatorMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  userName?: string;
  userRole?: string;
  locationName?: string;
}

export default function OperatorMobileNav({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  userName = 'Store Operator',
  userRole = 'Operator',
  locationName
}: OperatorMobileNavProps) {
  const navigationItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'signage', label: 'Digital Signage', icon: Monitor },
    { id: 'labels', label: 'Shelf Labels', icon: Tag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'store', label: 'Store Configuration', icon: Store },
  ];

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-[200] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-white shadow-2xl z-[201] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">{userName}</h2>
              {locationName && (
                <p className="text-sm text-slate-600 truncate">{locationName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0 ml-2"
              aria-label="Close navigation"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                Navigation
              </p>
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const isActive = currentView === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all touch-manipulation ${
                        isActive
                          ? 'bg-green-50 text-green-900 font-semibold border border-green-200'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-green-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-base">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="text-xs text-slate-500 text-center">
              <p className="font-medium">{userRole}</p>
              <p className="text-slate-400 mt-1">WAND Digital Studio</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
