import { useState, useEffect } from 'react';
import { Search, Image as ImageIcon, Video, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Asset } from '../../types/assets';

interface AssetLibraryTabProps {
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  companyId?: number | null;
  conceptId?: number | null;
  storeId?: number | null;
}

export function AssetLibraryTab({
  selectedAssetId,
  onSelectAsset,
  companyId,
  conceptId,
  storeId
}: AssetLibraryTabProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');

  useEffect(() => {
    loadAssets();
  }, [companyId, conceptId, storeId, filterType]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('asset_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.or(`store_id.eq.${storeId},store_id.is.null`);
      } else if (conceptId) {
        query = query.or(`concept_id.eq.${conceptId},concept_id.is.null,store_id.is.null`);
      } else if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      if (filterType !== 'all') {
        query = query.eq('asset_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssetUrl = (asset: Asset) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/assets/${asset.storage_path}`;
  };

  const getScopeLabel = (asset: Asset) => {
    if (asset.store_id) return 'Store';
    if (asset.concept_id) return 'Concept';
    if (asset.company_id) return 'Company';
    return 'Global';
  };

  const getScopeBadgeColor = (asset: Asset) => {
    if (asset.store_id) return 'bg-green-100 text-green-700';
    if (asset.concept_id) return 'bg-blue-100 text-blue-700';
    if (asset.company_id) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'image'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline-block mr-1" />
            Images
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'video'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Video className="w-4 h-4 inline-block mr-1" />
            Videos
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">No Assets Found</h3>
            <p className="text-sm text-slate-500">
              {searchTerm ? 'Try a different search term' : 'Upload assets to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => onSelectAsset(asset.id)}
                className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  selectedAssetId === asset.id
                    ? 'border-blue-600 ring-4 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {asset.asset_type === 'video' ? (
                  <div className="relative w-full h-full bg-slate-900">
                    <video
                      src={getAssetUrl(asset)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={getAssetUrl(asset)}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScopeBadgeColor(asset)} flex items-center gap-1`}>
                    <MapPin className="w-3 h-3" />
                    {getScopeLabel(asset)}
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="text-sm font-medium text-white truncate">
                      {asset.title}
                    </h4>
                    <p className="text-xs text-white/80 capitalize">
                      {asset.asset_type}
                    </p>
                  </div>
                </div>

                {selectedAssetId === asset.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
