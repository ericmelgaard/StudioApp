import { useState } from 'react';
import { Palette, ExternalLink, Info } from 'lucide-react';

interface DesignTabProps {
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

export function DesignTab({
  selectedAssetId,
  onSelectAsset
}: DesignTabProps) {
  const [designTool, setDesignTool] = useState<'canva' | 'figma' | null>(null);

  const designTools = [
    {
      id: 'canva' as const,
      name: 'Canva',
      description: 'Design graphics, presentations, and videos',
      icon: '🎨',
      status: 'coming-soon'
    },
    {
      id: 'figma' as const,
      name: 'Figma',
      description: 'Import designs from Figma projects',
      icon: '🎯',
      status: 'coming-soon'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            Design Tool Integration
          </h4>
          <p className="text-sm text-blue-700">
            Connect your favorite design tools to import content directly into your theme boards.
            This feature allows seamless workflow between design and deployment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {designTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setDesignTool(tool.id)}
            disabled={tool.status === 'coming-soon'}
            className={`relative p-6 rounded-xl border-2 text-left transition-all ${
              designTool === tool.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } ${tool.status === 'coming-soon' ? 'opacity-60' : ''}`}
          >
            <div className="text-4xl mb-3">{tool.icon}</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
              {tool.name}
              {tool.status === 'coming-soon' && (
                <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                  Coming Soon
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {tool.description}
            </p>

            {tool.status !== 'coming-soon' && (
              <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                Connect
                <ExternalLink className="w-4 h-4" />
              </div>
            )}
          </button>
        ))}
      </div>

      {designTool && (
        <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Palette className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                Integration Coming Soon
              </h3>
              <p className="text-sm text-slate-500">
                We're working on bringing {designTool === 'canva' ? 'Canva' : 'Figma'} integration to make
                your design workflow seamless.
              </p>
            </div>
          </div>
        </div>
      )}

      {!designTool && (
        <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-center">
            <Palette className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              Select a Design Tool
            </h3>
            <p className="text-sm text-slate-500">
              Choose a design tool above to connect and import your designs
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
