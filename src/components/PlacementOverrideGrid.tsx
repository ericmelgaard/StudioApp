import { useState } from 'react';
import { ChevronRight, ChevronDown, Layers, RotateCcw, Edit2, Trash2 } from 'lucide-react';

interface PlacementGroup {
  id: string;
  name: string;
  parent_id: string | null;
  store_id: number;
}

interface PlacementOverride {
  id: string;
  placement_group_id: string;
  schedule_group_id: string;
}

interface DaypartDefinition {
  id: string;
  name: string;
  color: string;
}

interface FilterOptions {
  dayparts: string[];
  placements: string[];
  showModifiedOnly: boolean;
  showOverridesOnly: boolean;
}

interface StagedChange {
  change_type: string;
  target_table: string;
  target_id?: string;
  change_data: any;
}

interface PlacementOverrideGridProps {
  placements: PlacementGroup[];
  overrides: PlacementOverride[];
  definitions: DaypartDefinition[];
  filterOptions: FilterOptions;
  stagedChanges: StagedChange[];
  onOverrideChange: (change: StagedChange) => void;
}

export default function PlacementOverrideGrid({
  placements,
  overrides,
  definitions,
  filterOptions,
  stagedChanges,
  onOverrideChange,
}: PlacementOverrideGridProps) {
  const [expandedPlacements, setExpandedPlacements] = useState<Record<string, boolean>>({});

  const buildHierarchy = (parentId: string | null = null, level: number = 0): any[] => {
    return placements
      .filter(p => p.parent_id === parentId)
      .map(placement => ({
        ...placement,
        level,
        children: buildHierarchy(placement.id, level + 1),
      }));
  };

  const hierarchy = buildHierarchy();

  const toggleExpanded = (placementId: string) => {
    setExpandedPlacements(prev => ({
      ...prev,
      [placementId]: !prev[placementId],
    }));
  };

  const hasOverride = (placementId: string) => {
    return overrides.some(o => o.placement_group_id === placementId);
  };

  const isModified = (placementId: string) => {
    return stagedChanges.some(
      change =>
        change.target_table === 'placement_daypart_overrides' &&
        (change.change_data.placement_group_id === placementId ||
         overrides.find(o => o.id === change.target_id)?.placement_group_id === placementId)
    );
  };

  const handleAddOverride = (placementId: string) => {
    console.log('Add override for placement:', placementId);
  };

  const handleRemoveOverride = (placementId: string) => {
    const override = overrides.find(o => o.placement_group_id === placementId);
    if (!override) return;

    onOverrideChange({
      change_type: 'delete',
      target_table: 'placement_daypart_overrides',
      target_id: override.id,
      change_data: {},
    });
  };

  const renderPlacement = (placement: any): JSX.Element => {
    const hasChildren = placement.children.length > 0;
    const isExpanded = expandedPlacements[placement.id];
    const override = hasOverride(placement.id);
    const modified = isModified(placement.id);

    const shouldShow =
      (filterOptions.placements.length === 0 || filterOptions.placements.includes(placement.id)) &&
      (!filterOptions.showOverridesOnly || override);

    if (!shouldShow) return null as any;

    return (
      <div key={placement.id}>
        <div
          className={`flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors group ${
            modified ? 'bg-amber-50 border-l-2 border-amber-400' : ''
          }`}
          style={{ paddingLeft: `${placement.level * 24 + 16}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(placement.id)}
              className="p-0.5 hover:bg-slate-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-600" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <Layers className="w-4 h-4 text-slate-400" />

          <span className="flex-1 text-sm text-slate-900">{placement.name}</span>

          {override ? (
            <>
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                Custom Override
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleAddOverride(placement.id)}
                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                  title="Edit override"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemoveOverride(placement.id)}
                  className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"
                  title="Reset to inherited"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded">
                Inherited
              </span>
              <button
                onClick={() => handleAddOverride(placement.id)}
                className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Override
              </button>
            </>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {placement.children.map((child: any) => renderPlacement(child))}
          </div>
        )}
      </div>
    );
  };

  const filteredHierarchy = hierarchy.filter((p: any) =>
    filterOptions.placements.length === 0 || filterOptions.placements.includes(p.id)
  );

  if (filteredHierarchy.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Placement Overrides</h3>
          <span className="text-sm text-slate-600">
            ({placements.length} placement{placements.length !== 1 ? 's' : ''})
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Override daypart schedules for specific placement groups. Changes inherit down the hierarchy unless overridden.
        </p>
      </div>

      <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
        {filteredHierarchy.map((placement: any) => renderPlacement(placement))}
      </div>
    </div>
  );
}
