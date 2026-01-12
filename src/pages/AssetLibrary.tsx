import React, { useState } from 'react';
import { Upload, Image, Settings } from 'lucide-react';
import { AssetUploadTab } from '../components/AssetUploadTab';
import { AssetBrowseTab } from '../components/AssetBrowseTab';
import { AssetManageTab } from '../components/AssetManageTab';
import type { Asset } from '../types/assets';

type TabType = 'upload' | 'browse' | 'manage';

export default function AssetLibrary() {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setActiveTab('browse');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setActiveTab('manage');
  };

  const handleSaveAsset = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCloseManage = () => {
    setSelectedAsset(null);
    setActiveTab('browse');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Library</h1>
        <p className="text-gray-600">
          Manage your images, videos, and documents with CCS hierarchy organization
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'browse'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Image className="w-4 h-4" />
              Browse
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'manage'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'upload' && (
            <AssetUploadTab onUploadComplete={handleUploadComplete} />
          )}
          {activeTab === 'browse' && (
            <AssetBrowseTab
              onEditAsset={handleEditAsset}
              refreshTrigger={refreshTrigger}
            />
          )}
          {activeTab === 'manage' && (
            <AssetManageTab
              asset={selectedAsset}
              onClose={handleCloseManage}
              onSave={handleSaveAsset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
