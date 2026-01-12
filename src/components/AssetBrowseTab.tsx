import React, { useState, useEffect } from 'react';
import { Search, Image, Video, FileText, Download, Trash2, Edit } from 'lucide-react';
import { assetService } from '../lib/assetService';
import type { Asset, AssetType, AssetFilters } from '../types/assets';
import AssetLocationSelector from './AssetLocationSelector';

interface AssetBrowseTabProps {
  onEditAsset: (asset: Asset) => void;
  refreshTrigger?: number;
}

export function AssetBrowseTab({ onEditAsset, refreshTrigger }: AssetBrowseTabProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AssetFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');

  useEffect(() => {
    loadAssets();
  }, [filters, refreshTrigger]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await assetService.getAssets(filters);
      setAssets(data);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchQuery || undefined
    }));
  };

  const handleTypeFilter = (type: AssetType | 'all') => {
    setSelectedType(type);
    setFilters(prev => ({
      ...prev,
      asset_type: type === 'all' ? undefined : type
    }));
  };

  const handleLocationFilter = (companyId: number | null, conceptId: number | null, storeId: number | null) => {
    setFilters(prev => ({
      ...prev,
      company_id: companyId || undefined,
      concept_id: conceptId || undefined,
      store_id: storeId || undefined
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      await assetService.deleteAsset(id);
      await loadAssets();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      alert('Failed to delete asset');
    }
  };

  const handleDownload = (asset: Asset) => {
    const url = assetService.getPublicUrl(asset.storage_path);
    window.open(url, '_blank');
  };

  const getAssetPreview = (asset: Asset) => {
    const cacheBuster = asset.updated_at ? new Date(asset.updated_at).getTime() : undefined;
    const previewUrl = asset.preview_path
      ? assetService.getPublicUrl(asset.preview_path, cacheBuster)
      : null;

    if (asset.asset_type === 'image' || asset.asset_type === 'video') {
      if (previewUrl) {
        return (
          <img
            src={previewUrl}
            alt={asset.title}
            className="w-full h-full object-contain"
          />
        );
      } else if (asset.asset_type === 'image') {
        return (
          <img
            src={assetService.getPublicUrl(asset.storage_path, cacheBuster)}
            alt={asset.title}
            className="w-full h-full object-contain"
          />
        );
      } else {
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Video className="w-12 h-12 text-gray-400" />
          </div>
        );
      }
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <FileText className="w-12 h-12 text-gray-400" />
        </div>
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by title, description, or filename..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex gap-2">
          <button
            onClick={() => handleTypeFilter('all')}
            className={`px-4 py-2 rounded-lg border ${
              selectedType === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleTypeFilter('image')}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
              selectedType === 'image'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Image className="w-4 h-4" />
            Images
          </button>
          <button
            onClick={() => handleTypeFilter('video')}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
              selectedType === 'video'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Video className="w-4 h-4" />
            Videos
          </button>
          <button
            onClick={() => handleTypeFilter('document')}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
              selectedType === 'document'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
        </div>

        <div className="flex-1">
          <AssetLocationSelector
            selectedCompanyId={filters.company_id || null}
            selectedConceptId={filters.concept_id || null}
            selectedStoreId={filters.store_id || null}
            onSelectionChange={handleLocationFilter}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No assets found. Upload your first asset to get started!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-gray-50">
                {getAssetPreview(asset)}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-gray-900 truncate">{asset.title}</h3>
                {asset.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{asset.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatFileSize(asset.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(asset.created_at)}</span>
                </div>
                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {asset.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        +{asset.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onEditAsset(asset)}
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Edit className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleDownload(asset)}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    <Download className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
