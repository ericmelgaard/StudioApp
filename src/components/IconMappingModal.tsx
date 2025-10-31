import { useState, useEffect } from 'react';
import { X, Link2, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IconPack {
  id: string;
  name: string;
  type: string;
}

interface Icon {
  id: string;
  name: string;
  label: string;
  image_url: string;
}

interface IntegrationSource {
  id: string;
  name: string;
}

interface IconMapping {
  id: string;
  integration_field: string;
  integration_value: string;
  icon_id: string;
}

interface IconMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IconMappingModal({ isOpen, onClose, onSuccess }: IconMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<IntegrationSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [iconPacks, setIconPacks] = useState<IconPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [icons, setIcons] = useState<Icon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample POS data (would come from integration_products in real use)
  const [posIconData, setPosIconData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [existingMappings, setExistingMappings] = useState<IconMapping[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPack) {
      loadIcons(selectedPack);
    }
  }, [selectedPack]);

  useEffect(() => {
    if (selectedSource) {
      loadExistingMappings(selectedSource);
      loadPOSIconData(selectedSource);
    }
  }, [selectedSource]);

  const loadData = async () => {
    setLoading(true);
    const [sourcesRes, packsRes] = await Promise.all([
      supabase.from('integration_sources').select('id, name').order('name'),
      supabase.from('icon_packs').select('*').eq('is_active', true).order('name')
    ]);

    if (sourcesRes.data) {
      setSources(sourcesRes.data);
      if (sourcesRes.data.length > 0 && !selectedSource) {
        setSelectedSource(sourcesRes.data[0].id);
      }
    }

    if (packsRes.data) {
      setIconPacks(packsRes.data);
      if (packsRes.data.length > 0 && !selectedPack) {
        setSelectedPack(packsRes.data[0].id);
      }
    }

    setLoading(false);
  };

  const loadIcons = async (packId: string) => {
    const { data } = await supabase
      .from('icons')
      .select('*')
      .eq('icon_pack_id', packId)
      .order('sort_order');

    if (data) {
      setIcons(data);
    }
  };

  const loadExistingMappings = async (sourceId: string) => {
    const { data } = await supabase
      .from('icon_mappings')
      .select('*')
      .eq('integration_source_id', sourceId);

    if (data) {
      setExistingMappings(data);
      const mappingRecord: Record<string, string> = {};
      data.forEach(m => {
        mappingRecord[`${m.integration_field}:${m.integration_value}`] = m.icon_id;
      });
      setMappings(mappingRecord);
    }
  };

  const loadPOSIconData = async (sourceId: string) => {
    // Load sample products from integration to extract icon fields
    const { data } = await supabase
      .from('integration_products')
      .select('data')
      .eq('source_id', sourceId)
      .limit(50);

    if (data) {
      const iconFields = new Set<string>();
      data.forEach(product => {
        const icons = product.data?.icons;
        if (Array.isArray(icons)) {
          icons.forEach((icon: any) => {
            if (typeof icon === 'string') {
              iconFields.add(icon);
            } else if (icon?.name) {
              iconFields.add(icon.name);
            }
          });
        }
      });

      setPosIconData(Array.from(iconFields).map(name => ({
        field: 'icons',
        value: name,
        label: name
      })));
    }
  };

  const handleSaveMapping = async (posValue: string, iconId: string) => {
    const key = `icons:${posValue}`;

    if (!iconId) {
      // Remove mapping
      const existing = existingMappings.find(
        m => m.integration_field === 'icons' && m.integration_value === posValue
      );

      if (existing) {
        await supabase.from('icon_mappings').delete().eq('id', existing.id);
      }

      const newMappings = { ...mappings };
      delete newMappings[key];
      setMappings(newMappings);
      return;
    }

    const { error } = await supabase
      .from('icon_mappings')
      .upsert({
        integration_source_id: selectedSource,
        integration_field: 'icons',
        integration_value: posValue,
        icon_id: iconId
      }, {
        onConflict: 'integration_source_id,integration_field,integration_value'
      });

    if (error) {
      console.error('Error saving mapping:', error);
      alert('Failed to save mapping');
    } else {
      setMappings({ ...mappings, [key]: iconId });
      loadExistingMappings(selectedSource);
    }
  };

  const filteredIcons = icons.filter(icon =>
    !searchQuery ||
    icon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    icon.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="relative z-[71] bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Map POS Icons to Icon Pack</h2>
            <p className="text-sm text-slate-600 mt-1">
              Link integration icon identifiers to your icon library
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Integration Source
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sources.map(source => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Icon Pack
              </label>
              <select
                value={selectedPack}
                onChange={(e) => setSelectedPack(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {iconPacks.map(pack => (
                  <option key={pack.id} value={pack.id}>{pack.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 grid grid-cols-3 gap-4">
              <div className="font-medium text-slate-700 text-sm">POS Icon Value</div>
              <div className="font-medium text-slate-700 text-sm col-span-2">Mapped Icon</div>
            </div>

            <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
              {posIconData.map((posIcon) => {
                const key = `icons:${posIcon.value}`;
                const mappedIconId = mappings[key];
                const mappedIcon = icons.find(i => i.id === mappedIconId);

                return (
                  <div key={posIcon.value} className="px-4 py-3 grid grid-cols-3 gap-4 items-center hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{posIcon.label}</span>
                      {mappedIconId && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    <div className="col-span-2 flex items-center gap-3">
                      {mappedIcon && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <img
                            src={mappedIcon.image_url}
                            alt={mappedIcon.label}
                            className="w-6 h-6 object-contain"
                          />
                          <span className="text-sm text-blue-900">{mappedIcon.label}</span>
                        </div>
                      )}

                      <select
                        value={mappedIconId || ''}
                        onChange={(e) => handleSaveMapping(posIcon.value, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">-- Select Icon --</option>
                        {filteredIcons.map(icon => (
                          <option key={icon.id} value={icon.id}>{icon.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {posIconData.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Link2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No icon data found</p>
              <p className="text-sm">Import products from your POS to see icon fields</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
