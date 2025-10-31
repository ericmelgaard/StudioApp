import { useState, useEffect } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';

export interface FilterSection {
  id: string;
  label: string;
  options: FilterOption[];
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterState {
  [sectionId: string]: string[];
}

interface AdvancedFilterProps {
  sections: FilterSection[];
  value: FilterState;
  onChange: (filters: FilterState) => void;
  buttonClassName?: string;
}

export default function AdvancedFilter({ sections, value, onChange, buttonClassName }: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = Object.values(value).reduce((sum, values) => sum + values.length, 0);

  const toggleOption = (sectionId: string, optionValue: string) => {
    const currentValues = value[sectionId] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];

    onChange({
      ...value,
      [sectionId]: newValues
    });
  };

  const clearSection = (sectionId: string) => {
    onChange({
      ...value,
      [sectionId]: []
    });
  };

  const clearAll = () => {
    const clearedState: FilterState = {};
    sections.forEach(section => {
      clearedState[section.id] = [];
    });
    onChange(clearedState);
  };

  const isOptionSelected = (sectionId: string, optionValue: string) => {
    return (value[sectionId] || []).includes(optionValue);
  };

  const getSectionActiveCount = (sectionId: string) => {
    return (value[sectionId] || []).length;
  };

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.advanced-filter-container')) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="advanced-filter-container relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || `flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors ${
          activeFilterCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-slate-700'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">
          {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {sections.map((section) => {
              const sectionCount = getSectionActiveCount(section.id);

              return (
                <div key={section.id} className="border-b border-slate-100 last:border-b-0">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-slate-700">{section.label}</h4>
                        {sectionCount > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {sectionCount}
                          </span>
                        )}
                      </div>
                      {sectionCount > 0 && (
                        <button
                          onClick={() => clearSection(section.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {section.options.map((option) => {
                        const isSelected = isOptionSelected(section.id, option.value);

                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOption(section.id, option.value)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                              />
                            </div>
                            <span className="text-sm text-slate-700 group-hover:text-slate-900">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
