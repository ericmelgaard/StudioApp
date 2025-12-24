import { Filter, X, Search } from 'lucide-react';
import { useState } from 'react';

interface DaypartDefinition {
  id: string;
  display_label: string;
}

interface PlacementGroup {
  id: string;
  name: string;
}

interface FilterOptions {
  dayparts: string[];
  placements: string[];
  showModifiedOnly: boolean;
  showOverridesOnly: boolean;
}

interface DaypartFilterToolbarProps {
  definitions: DaypartDefinition[];
  placements: PlacementGroup[];
  filterOptions: FilterOptions;
  onFilterChange: (options: FilterOptions) => void;
}

export default function DaypartFilterToolbar({
  definitions,
  placements,
  filterOptions,
  onFilterChange,
}: DaypartFilterToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleDaypart = (daypartId: string) => {
    const newDayparts = filterOptions.dayparts.includes(daypartId)
      ? filterOptions.dayparts.filter(id => id !== daypartId)
      : [...filterOptions.dayparts, daypartId];

    onFilterChange({ ...filterOptions, dayparts: newDayparts });
  };

  const togglePlacement = (placementId: string) => {
    const newPlacements = filterOptions.placements.includes(placementId)
      ? filterOptions.placements.filter(id => id !== placementId)
      : [...filterOptions.placements, placementId];

    onFilterChange({ ...filterOptions, placements: newPlacements });
  };

  const clearFilters = () => {
    onFilterChange({
      dayparts: [],
      placements: [],
      showModifiedOnly: false,
      showOverridesOnly: false,
    });
    setSearchTerm('');
  };

  const hasActiveFilters =
    filterOptions.dayparts.length > 0 ||
    filterOptions.placements.length > 0 ||
    filterOptions.showModifiedOnly ||
    filterOptions.showOverridesOnly ||
    searchTerm.length > 0;

  const filteredDefinitions = definitions.filter(def =>
    def.display_label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPlacements = placements.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search dayparts or placements..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            hasActiveFilters
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
              {filterOptions.dayparts.length + filterOptions.placements.length +
               (filterOptions.showModifiedOnly ? 1 : 0) + (filterOptions.showOverridesOnly ? 1 : 0)}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => onFilterChange({ ...filterOptions, showModifiedOnly: !filterOptions.showModifiedOnly })}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterOptions.showModifiedOnly
                ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Modified Only
          </button>
          {placements.length > 0 && (
            <button
              onClick={() => onFilterChange({ ...filterOptions, showOverridesOnly: !filterOptions.showOverridesOnly })}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterOptions.showOverridesOnly
                  ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              Overrides Only
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Dayparts</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredDefinitions.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No dayparts found</p>
                ) : (
                  filteredDefinitions.map(def => (
                    <label key={def.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={filterOptions.dayparts.includes(def.id)}
                        onChange={() => toggleDaypart(def.id)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{def.display_label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {placements.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Placements</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredPlacements.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No placements found</p>
                  ) : (
                    filteredPlacements.map(placement => (
                      <label key={placement.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={filterOptions.placements.includes(placement.id)}
                          onChange={() => togglePlacement(placement.id)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{placement.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              {filterOptions.dayparts.length > 0 && (
                <span className="mr-3">
                  <strong>{filterOptions.dayparts.length}</strong> daypart{filterOptions.dayparts.length !== 1 ? 's' : ''} selected
                </span>
              )}
              {filterOptions.placements.length > 0 && (
                <span>
                  <strong>{filterOptions.placements.length}</strong> placement{filterOptions.placements.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <button
              onClick={() => setShowFilters(false)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
