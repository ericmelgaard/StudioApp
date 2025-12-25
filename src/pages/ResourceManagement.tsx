import { useState, useEffect } from 'react';
import { ArrowLeft, Package, Plus, Upload, Trash2, Edit2, ImageIcon, Tag, Search, X, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconMappingModal from '../components/IconMappingModal';

interface IconPack {
  id: string;
  name: string;
  description: string | null;
  type: 'nutritional' | 'cta' | 'general';
  is_active: boolean;
  created_at: string;
}

interface Icon {
  id: string;
  icon_pack_id: string;
  name: string;
  label: string;
  image_url: string;
  metadata: any;
  sort_order: number;
}

interface ProductImage {
  id: string;
  name: string;
  url: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  tags: string[];
  created_at: string;
}

interface ResourceManagementProps {
  onBack: () => void;
}

export default function ResourceManagement({ onBack }: ResourceManagementProps) {
  const [activeTab, setActiveTab] = useState<'icon-packs' | 'images'>('icon-packs');
  const [loading, setLoading] = useState(false);

  // Icon Pack state
  const [iconPacks, setIconPacks] = useState<IconPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<IconPack | null>(null);
  const [icons, setIcons] = useState<Icon[]>([]);
  const [showCreatePackModal, setShowCreatePackModal] = useState(false);
  const [showAddIconModal, setShowAddIconModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);

  // Image state
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadIconPacks();
    loadProductImages();
  }, []);

  useEffect(() => {
    if (selectedPack) {
      loadIcons(selectedPack.id);
    } else {
      setIcons([]);
    }
  }, [selectedPack]);

  const loadIconPacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('icon_packs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading icon packs:', error);
    } else {
      setIconPacks(data || []);
      if (data && data.length > 0 && !selectedPack) {
        setSelectedPack(data[0]);
      }
    }
    setLoading(false);
  };

  const loadIcons = async (packId: string) => {
    const { data, error } = await supabase
      .from('icons')
      .select('*')
      .eq('icon_pack_id', packId)
      .order('sort_order');

    if (error) {
      console.error('Error loading icons:', error);
    } else {
      setIcons(data || []);
    }
  };

  const loadProductImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading product images:', error);
    } else {
      setProductImages(data || []);
    }
    setLoading(false);
  };

  const deleteIconPack = async (packId: string) => {
    if (!confirm('Are you sure you want to delete this icon pack? All icons in this pack will be deleted.')) {
      return;
    }

    const { error } = await supabase
      .from('icon_packs')
      .delete()
      .eq('id', packId);

    if (error) {
      console.error('Error deleting icon pack:', error);
      alert('Failed to delete icon pack');
    } else {
      loadIconPacks();
      if (selectedPack?.id === packId) {
        setSelectedPack(null);
      }
    }
  };

  const deleteIcon = async (iconId: string) => {
    if (!confirm('Are you sure you want to delete this icon?')) {
      return;
    }

    const { error } = await supabase
      .from('icons')
      .delete()
      .eq('id', iconId);

    if (error) {
      console.error('Error deleting icon:', error);
      alert('Failed to delete icon');
    } else {
      if (selectedPack) {
        loadIcons(selectedPack.id);
      }
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    } else {
      loadProductImages();
    }
  };

  const filteredImages = productImages.filter(img =>
    !searchQuery ||
    img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Back</span>
                </button>
                <div className="h-6 w-px bg-slate-300" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">Resources</h1>
                    <p className="text-sm text-slate-600">Manage icons and images</p>
                  </div>
                </div>
              </div>

              {activeTab === 'icon-packs' && (
                <button
                  onClick={() => setShowMappingModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Map POS Icons
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('icon-packs')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'icon-packs'
                    ? 'border-b-2 border-green-500 text-green-600 bg-green-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Icon Packs
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'images'
                    ? 'border-b-2 border-green-500 text-green-600 bg-green-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Product Images
              </button>
            </div>
          </div>

          {/* Icon Packs Content */}
          {activeTab === 'icon-packs' && (
            <div className="grid grid-cols-12 divide-x divide-slate-200">
              {/* Icon Pack List */}
              <div className="col-span-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Icon Packs</h2>
                  <button
                    onClick={() => setShowCreatePackModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Pack
                  </button>
                </div>

                <div className="space-y-2">
                  {iconPacks.map(pack => (
                    <div
                      key={pack.id}
                      onClick={() => setSelectedPack(pack)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedPack?.id === pack.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-slate-900">{pack.name}</h3>
                            {pack.is_active && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{pack.description || 'No description'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                              {pack.type}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteIconPack(pack.id);
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {iconPacks.length === 0 && (
                    <div className="text-center py-4 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No icon packs yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Icons in Selected Pack */}
              <div className="col-span-8 p-6">
                {selectedPack ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{selectedPack.name}</h2>
                        <p className="text-sm text-slate-600 mt-1">{icons.length} icons</p>
                      </div>
                      <button
                        onClick={() => setShowAddIconModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Icon
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {icons.map(icon => (
                        <div
                          key={icon.id}
                          className="border border-slate-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                              <img src={icon.image_url} alt={icon.label} className="w-full h-full object-contain" />
                            </div>
                            <button
                              onClick={() => deleteIcon(icon.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <h4 className="font-medium text-slate-900 text-sm mb-1">{icon.label}</h4>
                          <p className="text-xs text-slate-500">{icon.name}</p>
                        </div>
                      ))}
                    </div>

                    {icons.length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No icons in this pack</p>
                        <p className="text-sm">Add icons to get started</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select an icon pack</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Images Content */}
          {activeTab === 'images' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search images by name or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
              </div>

              <div className="grid grid-cols-4 gap-6">
                {filteredImages.map(image => (
                  <div
                    key={image.id}
                    className="border border-slate-200 rounded-lg overflow-hidden hover:border-green-300 hover:shadow-md transition-all group"
                  >
                    <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                      <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-slate-900 text-sm flex-1">{image.name}</h4>
                        <button
                          onClick={() => deleteImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {image.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {image.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredImages.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No images found</p>
                  <p className="text-sm">Upload images to get started</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <IconMappingModal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        onSuccess={() => {
          setShowMappingModal(false);
        }}
      />

      {/* TODO: Add modals for creating packs, adding icons, and uploading images */}
    </div>
  );
}
