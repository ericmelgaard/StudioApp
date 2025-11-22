import { Link as LinkIcon, Copy, Unlink } from 'lucide-react';
import { StateBadge } from './StateBadge';

interface LinkedSource {
  id: string;
  name: string;
  mapping_id: string;
  integration_type: string;
  last_synced_at?: string;
  isActive: boolean;
  overrideCount?: number;
  price_mode?: string;
  price_value?: number;
  price_range_low?: number;
  price_range_high?: number;
  linked_product_id?: string;
  price_calculation?: any;
}

interface ApiIntegrationSectionProps {
  mode: 'create' | 'edit';
  linkedSources?: LinkedSource[];
  viewingSourceId?: string | null;
  currentItem?: {
    mapping_id?: string;
    integration_type?: string;
    integration_source_id?: string;
    last_synced_at?: string;
    local_fields?: string[];
    price_calculations?: Record<string, any>;
  } | null;
  onViewSource?: (sourceId: string) => void;
  onChangeLink?: (source: LinkedSource) => void;
  onUnlink?: () => Promise<void>;
  onClearCurrent?: () => void;
  onLinkNew?: () => void;
}

export function ApiIntegrationSection({
  mode,
  linkedSources = [],
  viewingSourceId,
  currentItem,
  onViewSource,
  onChangeLink,
  onUnlink,
  onClearCurrent,
  onLinkNew,
}: ApiIntegrationSectionProps) {
  const hasLinkedSources = linkedSources.length > 0;
  const hasCurrentMapping = currentItem?.mapping_id && currentItem?.integration_source_id;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <LinkIcon className="w-4 h-4" />
        API Integration
      </h3>

      {mode === 'edit' && hasLinkedSources ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {linkedSources.map(source => {
              const isPreviewing = viewingSourceId === source.id;
              const badgeText = source.isActive ? 'ACTIVE'
                : isPreviewing ? 'PREVIEWING'
                : 'INACTIVE';
              const badgeVariant = source.isActive ? 'active'
                : isPreviewing ? 'previewing'
                : 'inactive';

              return (
                <div
                  key={source.id}
                  onClick={() => onViewSource?.(source.id)}
                  className="rounded-lg border-2 border-slate-200 bg-white p-3 cursor-pointer hover:border-slate-300 hover:shadow transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-slate-900 truncate">
                      {source.name}
                    </h4>
                    <StateBadge variant={badgeVariant} text={badgeText} />
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-2">
                      <StateBadge variant="api" text="Linked" />
                      {source.isActive && source.overrideCount && source.overrideCount > 0 && (
                        <span>{source.overrideCount} override{source.overrideCount > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-medium">ID:</span>
                      <span className="truncate">{source.mapping_id}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(source.mapping_id);
                        }}
                        className="p-0.5 hover:bg-slate-100 rounded"
                        title="Copy Mapping ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <div>
                      <span className="font-medium">Type:</span> {source.integration_type}
                    </div>

                    {source.price_mode && (
                      <div>
                        <span className="font-medium">Price:</span>{' '}
                        {source.price_mode === 'range' && source.price_range_low !== undefined && source.price_range_high !== undefined
                          ? `$${source.price_range_low} - $${source.price_range_high}`
                          : source.price_mode === 'manual' && source.price_value !== undefined
                          ? `$${source.price_value}`
                          : source.price_mode === 'direct'
                          ? 'Direct link'
                          : source.price_mode === 'calculation'
                          ? 'Calculated'
                          : 'Not set'}
                      </div>
                    )}

                    {source.isActive && source.last_synced_at && (
                      <div className="text-xs text-slate-500">
                        Last synced: {new Date(source.last_synced_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeLink?.(source);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                  >
                    <LinkIcon className="w-3 h-3 inline mr-1" />
                    Change Link
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : mode === 'edit' && hasCurrentMapping ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <StateBadge variant="api" text="Linked to API" />
            {currentItem?.local_fields && currentItem.local_fields.length > 0 && (
              <StateBadge variant="local" text={`${currentItem.local_fields.length} override(s)`} />
            )}
            {currentItem?.price_calculations && Object.keys(currentItem.price_calculations).length > 0 && (
              <StateBadge variant="calculated" text="Has calculations" />
            )}
          </div>
          <div className="text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Mapping ID:</span>
              <span>{currentItem?.mapping_id}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentItem?.mapping_id) navigator.clipboard.writeText(currentItem.mapping_id);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                title="Copy Mapping ID"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div><span className="font-medium">Type:</span> {currentItem?.integration_type}</div>
            {currentItem?.last_synced_at && (
              <div><span className="font-medium">Last synced:</span> {new Date(currentItem.last_synced_at).toLocaleString()}</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onUnlink}
              className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Unlink className="w-3 h-3 inline mr-1" />
              Unlink
            </button>
          </div>
        </div>
      ) : mode === 'create' && currentItem?.mapping_id ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <StateBadge variant="api" text="Linked to API" />
          </div>
          <div className="text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Mapping ID:</span>
              <span>{currentItem?.mapping_id}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentItem?.mapping_id) navigator.clipboard.writeText(currentItem.mapping_id);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                title="Copy Mapping ID"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div><span className="font-medium">Type:</span> {currentItem?.integration_type}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClearCurrent}
              className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Unlink className="w-3 h-3 inline mr-1" />
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            This item is not linked to any API source. Link it to sync data automatically.
          </p>
          <button
            onClick={onLinkNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <LinkIcon className="w-4 h-4 inline mr-2" />
            Link to API Source
          </button>
        </div>
      )}
    </div>
  );
}
