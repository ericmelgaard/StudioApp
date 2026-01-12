import { useState, useEffect } from 'react';
import { X, Search, Image as ImageIcon, Video, FileText, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { assetService } from '../lib/assetService';
import type { Asset } from '../types/assets';

interface AssetLibraryModalProps {
  onClose: () => void;
  onSelectAssets: (assets: Asset[]) => void;
  multiSelect?: boolean;
}

export function AssetLibraryModal({
  onClose,
  onSelectAssets,
  multiSelect = false
}: AssetLibraryModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asset_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const toggleAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleConfirm = () => {
    const selectedAssetObjects = assets.filter(a => selectedAssets.has(a.id));
    onSelectAssets(selectedAssetObjects);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Select Assets</h2>
            <p className="text-sm text-slate-600 mt-1">
              {multiSelect ? 'Choose one or more assets to add' : 'Choose an asset to add'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-600">Loading assets...</div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <ImageIcon className="w-16 h-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No assets found</h3>
              <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map(asset => {
                const isSelected = selectedAssets.has(asset.id);
                return (
                  <div
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'ring-4 ring-blue-500'
                        : 'hover:ring-2 hover:ring-slate-300'
                    }`}
                  >
                    <div className="aspect-video bg-slate-200 flex items-center justify-center">
                      {asset.preview_path ? (
                        <img
                          src={assetService.getPublicUrl(asset.preview_path)}
                          alt={asset.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-slate-400">
                          {getAssetIcon(asset.asset_type)}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className="p-3 bg-white border-t border-slate-200">
                      <h3 className="text-sm font-medium text-slate-900 truncate mb-1">
                        {asset.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        {getAssetIcon(asset.asset_type)}
                        <span className="capitalize">{asset.asset_type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-white">
          <div className="text-sm text-slate-600">
            {selectedAssets.size} {selectedAssets.size === 1 ? 'asset' : 'assets'} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedAssets.size === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {selectedAssets.size > 0 ? `(${selectedAssets.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
