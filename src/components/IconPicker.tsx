import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { X, Search } from 'lucide-react';

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}

const popularIcons = [
  'Clock', 'Sun', 'Moon', 'Coffee', 'Utensils', 'Pizza',
  'Wine', 'ShoppingBag', 'Package', 'Star', 'Heart', 'Zap'
];

export default function IconPicker({ selectedIcon, onSelect }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const allIconNames = useMemo(() => {
    return Object.keys(Icons)
      .filter(name => {
        const icon = Icons[name as keyof typeof Icons];
        return typeof icon === 'object' && 'render' in icon;
      })
      .sort();
  }, []);

  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return popularIcons;
    }
    return allIconNames.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allIconNames]);

  const renderIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return <IconComponent size={24} />;
  };

  const SelectedIconComponent = Icons[selectedIcon as keyof typeof Icons] as any;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
      >
        {SelectedIconComponent && <SelectedIconComponent size={20} className="text-slate-600" />}
        <span className="text-slate-700">{selectedIcon}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Select an Icon</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {!searchTerm && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing popular icons. Use search to find more.
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-6 gap-3">
                {filteredIcons.map(iconName => (
                  <button
                    key={iconName}
                    onClick={() => {
                      onSelect(iconName);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-gray-50 ${
                      selectedIcon === iconName
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    title={iconName}
                  >
                    <div className="text-gray-700">
                      {renderIcon(iconName)}
                    </div>
                    <span className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                      {iconName}
                    </span>
                  </button>
                ))}
              </div>
              {filteredIcons.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No icons found matching "{searchTerm}"
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
