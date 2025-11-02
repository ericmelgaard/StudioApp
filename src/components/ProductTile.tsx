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
  integration_source_name?: string;
  attribute_mappings?: Record<string, any>;
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

  function stripHtmlTags(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  const rawName = product.attributes?.name || product.name;
  const displayName = stripHtmlTags(rawName);
  const imageUrl = product.attributes?.thumbnail || product.attributes?.image_url;
  const description = product.attributes?.description;
  const price = product.attributes?.price;
  const calories = product.attributes?.calories;
  const portion = product.attributes?.portion;
  const mealPeriods = product.attributes?.meal_periods;
  const mealStations = product.attributes?.meal_stations;
  const sizes = product.attributes?.sizes;

  const hasCalculatedPrice = product.attribute_mappings?.price?.type === 'calculation';
  const hasIntegrationSource = product.integration_source_name || hasCalculatedPrice;

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {pendingPublication && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500 text-white rounded-lg shadow-lg text-xs font-medium">
          <Calendar className="w-3.5 h-3.5" />
          Scheduled
        </div>
      )}
      {imageUrl && (
        <div className="relative overflow-hidden flex-shrink-0" style={{ height: '140px' }}>
          <div className={`absolute inset-0 bg-white transition-opacity duration-300 z-10 ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}>
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-scale-down"
            />
            {hasIntegrationSource && (
              <div className="absolute top-2 right-2">
                <img
                  src="/logo_32 copy.png"
                  alt={product.integration_source_name || 'QU Beyond'}
                  className="w-5 h-5 rounded"
                  title={product.integration_source_name || 'QU Beyond (Calculated)'}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
              <h3 className="font-semibold text-white text-sm p-4 line-clamp-2 w-full">
                {displayName}
              </h3>
            </div>
          </div>
          <div
            className={`absolute inset-0 bg-white p-4 flex flex-col justify-between transition-opacity duration-300 z-[15] ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                {displayName}
              </h3>
              <p className="text-xs text-slate-500">ID: {product.id.slice(0, 8)}</p>
              {description && (
                <div
                  className="text-xs text-slate-600 line-clamp-3 prose prose-xs max-w-none"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">
                  {price ? `$${price}` : 'N/A'}
                </span>
                {calories && (
                  <span className="text-slate-600">{calories} cal</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col relative">
        {!imageUrl && hasIntegrationSource && (
          <div className="absolute top-2 right-2 z-10">
            <img
              src="/logo_32 copy.png"
              alt={product.integration_source_name || 'QU Beyond'}
              className="w-5 h-5 rounded"
              title={product.integration_source_name || 'QU Beyond (Calculated)'}
            />
          </div>
        )}
        {!imageUrl && (
          <>
            <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
              {displayName}
            </h3>
            <p className="text-xs text-slate-500 mb-3">ID: {product.id.slice(0, 8)}</p>
          </>
        )}

        <div className="space-y-3 flex-1 flex flex-col justify-between">
          {!imageUrl && description && (
            <div
              className="text-sm text-slate-600 line-clamp-2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900">
              {price ? `$${price}` : 'N/A'}
            </span>
            {calories && (
              <span className="text-sm text-slate-600">{calories} cal</span>
            )}
          </div>

          {!imageUrl && Array.isArray(mealPeriods) && mealPeriods.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mealPeriods.slice(0, 2).map((mp: any, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {mp.period}
                </span>
              ))}
              {mealPeriods.length > 2 && (
                <span className="text-xs text-slate-500">
                  +{mealPeriods.length - 2}
                </span>
              )}
            </div>
          )}

          {!imageUrl && Array.isArray(mealStations) && mealStations.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-medium">Station:</span>{' '}
              {mealStations[0].station}
              {mealStations.length > 1 && ` +${mealStations.length - 1}`}
            </div>
          )}

          {portion && (
            <div className="text-xs text-slate-600">
              <span className="font-medium">Portion:</span> {portion}
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
}
