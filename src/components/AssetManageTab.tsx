import React, { useState, useEffect } from 'react';
import { X, Save, Image, Video, FileText } from 'lucide-react';
import { assetService } from '../lib/assetService';
import type { Asset, AssetFormData } from '../types/assets';
import AssetLocationSelector from './AssetLocationSelector';

interface AssetManageTabProps {
  asset: Asset | null;
  onClose: () => void;
  onSave: () => void;
}

export function AssetManageTab({ asset, onClose, onSave }: AssetManageTabProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    title: '',
    description: '',
    tags: [],
    company_id: null,
    concept_id: null,
    store_id: null
  });
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({
        title: asset.title,
        description: asset.description,
        tags: asset.tags,
        company_id: asset.company_id,
        concept_id: asset.concept_id,
        store_id: asset.store_id
      });
    }
  }, [asset]);

  if (!asset) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select an asset from the Browse tab to edit its metadata
      </div>
    );
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await assetService.updateAsset(asset.id, formData);
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to update asset:', error);
      alert('Failed to update asset');
    } finally {
      setIsSaving(false);
    }
  };

  const getAssetPreview = () => {
    if (asset.asset_type === 'image') {
      return (
        <img
          src={assetService.getPublicUrl(asset.storage_path)}
          alt={asset.title}
          className="w-full h-64 object-contain bg-gray-100 rounded-lg"
        />
      );
    } else if (asset.asset_type === 'video') {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
          <Video className="w-16 h-16 text-gray-400" />
        </div>
      );
    } else {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
          <FileText className="w-16 h-16 text-gray-400" />
        </div>
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Asset Metadata</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {getAssetPreview()}

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Filename:</span>
              <span className="font-medium">{asset.filename}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium capitalize">{asset.asset_type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">{formatFileSize(asset.file_size)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Uploaded:</span>
              <span className="font-medium">
                {new Date(asset.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Updated:</span>
              <span className="font-medium">
                {new Date(asset.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter asset title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter asset description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add tags (press Enter)"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope (Optional)
            </label>
            <AssetLocationSelector
              selectedCompanyId={formData.company_id}
              selectedConceptId={formData.concept_id}
              selectedStoreId={formData.store_id}
              onSelectionChange={(companyId, conceptId, storeId) => {
                setFormData(prev => ({
                  ...prev,
                  company_id: companyId,
                  concept_id: conceptId,
                  store_id: storeId
                }));
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optionally scope this asset to a specific company, concept, or store
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title || isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
