import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Search, Layout } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Asset } from '../types/assets';

interface AddContentModalProps {
  boardId: string;
  onClose: () => void;
  onContentAdded: () => void;
}

export function AddContentModal({ boardId, onClose, onContentAdded }: AddContentModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'asset' | 'template'>('asset');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
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

  const filteredAssets = assets.filter(asset =>
    asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddContent = async () => {
    if (!selectedAssetId && contentType === 'asset') return;

    try {
      const { data: existingContent } = await supabase
        .from('board_content')
        .select('order_position')
        .eq('board_id', boardId)
        .order('order_position', { ascending: false })
        .limit(1);

      const nextPosition = existingContent && existingContent.length > 0
        ? existingContent[0].order_position + 1
        : 1;

      const { error } = await supabase
        .from('board_content')
        .insert({
          board_id: boardId,
          content_type: contentType,
          asset_id: contentType === 'asset' ? selectedAssetId : null,
          order_position: nextPosition,
          duration_seconds: 10,
          transition_effect: 'fade',
          status: 'active'
        });

      if (error) throw error;

      onContentAdded();
      onClose();
    } catch (error) {
      console.error('Error adding content:', error);
      alert('Failed to add content. Please try again.');
    }
  };

  const getAssetUrl = (asset: Asset) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${asset.storage_path}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Add Content to Board</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setContentType('asset')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                contentType === 'asset'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4 inline-block mr-2" />
              Asset Library
            </button>
            <button
              onClick={() => setContentType('template')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                contentType === 'template'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layout className="w-4 h-4 inline-block mr-2" />
              Templates
            </button>
          </div>

          {contentType === 'asset' && (
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
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {contentType === 'asset' ? (
            loading ? (
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
              <div className="grid grid-cols-3 gap-4">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
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
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Layout className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">Templates Coming Soon</h3>
              <p className="text-sm text-slate-500">
                Template support will be available in a future update
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAddContent}
            disabled={contentType === 'asset' && !selectedAssetId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add to Board
          </button>
        </div>
      </div>
    </div>
  );
}
