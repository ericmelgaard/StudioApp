import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
}

interface ProductTileProps {
  product: Product;
  onClick?: () => void;
}

export default function ProductTile({ product, onClick }: ProductTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pendingPublication, setPendingPublication] = useState<any>(null);

  useEffect(() => {
    checkPendingPublication();
  }, [product.id]);

  async function checkPendingPublication() {
    const { data } = await supabase
      .from('product_publications')
      .select('publish_at, status')
      .eq('product_id', product.id)
      .in('status', ['draft', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setPendingPublication(data);
  }

  // Use attributes.name if available, otherwise fall back to product.name
  const displayName = product.attributes?.name || product.name;
  const imageUrl = product.attributes?.thumbnail || product.attributes?.image_url;
  const description = product.attributes?.description;
  const price = product.attributes?.price;
  const calories = product.attributes?.calories;
  const portion = product.attributes?.portion;
  const mealPeriods = product.attributes?.meal_periods;
  const mealStations = product.attributes?.meal_stations;
  const sizes = product.attributes?.sizes;

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col"
      style={{ height: '320px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image Area - Fixed Height */}
      <div className="relative h-40 overflow-hidden flex-shrink-0 bg-slate-100">
        {pendingPublication && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500 text-white rounded-lg shadow-lg text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" />
            Scheduled
          </div>
        )}

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-slate-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Content Area - Fixed Height */}
      <div className="p-4 flex flex-col flex-1 min-h-0">
        {/* Title */}
        <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-2">
          {displayName}
        </h3>

        {/* Description */}
        <div className="mb-3 flex-shrink-0" style={{ height: '32px' }}>
          {description && (
            <p className="text-xs text-slate-600 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Price and Calories */}
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="font-semibold text-slate-900 text-sm">
            {price ? `$${price}` : 'N/A'}
          </span>
          {calories && (
            <span className="text-xs text-slate-600">{calories} cal</span>
          )}
        </div>

        {/* Additional Info - Scrollable if needed */}
        <div className="space-y-2 flex-1 min-h-0 overflow-hidden">
          {Array.isArray(sizes) && sizes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sizes.slice(0, 3).map((size: any, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700"
                >
                  {size.label} {size.price && `$${size.price}`}
                </span>
              ))}
              {sizes.length > 3 && (
                <span className="text-xs text-slate-500">
                  +{sizes.length - 3}
                </span>
              )}
            </div>
          )}

          {portion && (
            <div className="text-xs text-slate-600">
              <span className="font-medium">Portion:</span> {portion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
