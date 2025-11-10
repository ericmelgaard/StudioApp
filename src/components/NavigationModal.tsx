import { X } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface NavigationItem {
  id?: string;
  label: string;
  icon: LucideIcon;
}

interface NavigationCategory {
  id: string;
  label: string;
  items: NavigationItem[];
}

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NavigationCategory[];
  currentView?: string;
  onNavigate: (viewId: string) => void;
}

export default function NavigationModal({
  isOpen,
  onClose,
  categories,
  currentView,
  onNavigate
}: NavigationModalProps) {
  if (!isOpen) return null;

  const getCurrentCategory = () => {
    return categories.find(cat =>
      cat.items.some(item => item.id === currentView)
    )?.id;
  };

  const currentCategory = getCurrentCategory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Navigation</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories List */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
          <div className="space-y-4">
            {categories.map((category) => {
              const isActive = category.id === currentCategory;

              return (
                <div key={category.id} className="space-y-2">
                  {/* Category Label */}
                  <div className={`px-4 py-3 rounded-lg ${
                    isActive
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-slate-50 border-2 border-transparent'
                  }`}>
                    <h3 className={`text-sm font-semibold ${
                      isActive ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      {category.label}
                    </h3>
                  </div>

                  {/* Sub-items - Horizontal Row */}
                  <div className="flex flex-wrap gap-2 px-2">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = item.id === currentView;

                      return (
                        <button
                          key={item.id || item.label}
                          onClick={() => {
                            if (item.id) {
                              onNavigate(item.id);
                              onClose();
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                            isItemActive
                              ? 'bg-blue-600 text-white shadow-md'
                              : item.id
                              ? 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          disabled={!item.id}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
