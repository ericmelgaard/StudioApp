import { useState, useEffect } from 'react';
import { Search, Image as ImageIcon, Video, Star, TrendingUp, Folder } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SharedContent {
  id: string;
  title: string;
  description: string;
  storage_path: string;
  file_type: string;
  asset_type: string;
  preview_path: string | null;
  collection_id: string | null;
  tags: string[];
  usage_count: number;
  is_featured: boolean;
  license_type: string;
  created_at: string;
}

interface ContentCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface SharedContentTabProps {
  selectedContentId: string | null;
  onSelectContent: (id: string) => void;
}

export function SharedContentTab({
  selectedContentId,
  onSelectContent
}: SharedContentTabProps) {
  const [content, setContent] = useState<SharedContent[]>([]);
  const [collections, setCollections] = useState<ContentCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'featured' | 'popular'>('all');

  useEffect(() => {
    loadCollections();
    loadContent();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCollection, filterType]);

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('content_collections')
        .select('*')
        .eq('status', 'active')
        .order('display_order');

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('shared_content_library')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedCollection) {
        query = query.eq('collection_id', selectedCollection);
      }

      if (filterType === 'featured') {
        query = query.eq('is_featured', true);
      } else if (filterType === 'popular') {
        query = query.order('usage_count', { ascending: false }).limit(50);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error loading shared content:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = content.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getContentUrl = (item: SharedContent) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${item.storage_path}`;
  };

  return (
    <div className="flex h-full gap-4">
      <div className="w-56 flex-shrink-0 overflow-y-auto">
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCollection(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCollection === null
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            All Content
          </button>

          {collections.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Collections
              </div>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => setSelectedCollection(collection.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedCollection === collection.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Folder className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{collection.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search shared content..."
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
              onClick={() => setFilterType('featured')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filterType === 'featured'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Star className="w-4 h-4" />
              Featured
            </button>
            <button
              onClick={() => setFilterType('popular')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filterType === 'popular'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Popular
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">No Shared Content</h3>
              <p className="text-sm text-slate-500">
                {searchTerm ? 'Try a different search term' : 'Check back later for curated content'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredContent.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectContent(item.id)}
                  className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    selectedContentId === item.id
                      ? 'border-blue-600 ring-4 ring-blue-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {item.asset_type === 'video' ? (
                    <div className="relative w-full h-full bg-slate-900">
                      <video
                        src={getContentUrl(item)}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Video className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={getContentUrl(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {item.is_featured && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h4 className="text-sm font-medium text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-white/80">
                        {item.usage_count} uses
                      </p>
                    </div>
                  </div>

                  {selectedContentId === item.id && (
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
    </div>
  );
}
