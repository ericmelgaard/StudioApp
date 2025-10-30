import { useState } from 'react';

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

  // Use attributes.name if available, otherwise fall back to product.name
  const displayName = product.attributes?.name || product.name;
  const imageUrl = product.attributes?.image_url;
  const description = product.attributes?.description;
  const price = product.attributes?.price;
  const calories = product.attributes?.calories;
  const portion = product.attributes?.portion;
  const mealPeriods = product.attributes?.meal_periods;
  const mealStations = product.attributes?.meal_stations;

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {imageUrl && (
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={displayName}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isHovered ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end transition-opacity duration-300 ${
              isHovered ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <h3 className="font-semibold text-white text-sm p-4 line-clamp-2 w-full">
              {displayName}
            </h3>
          </div>
          <div
            className={`absolute inset-0 bg-white p-4 flex flex-col justify-between transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                {displayName}
              </h3>
              <p className="text-xs text-slate-500">ID: {product.id.slice(0, 8)}</p>
              {description && (
                <p className="text-xs text-slate-600 line-clamp-3">{description}</p>
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

      <div className="p-4 flex-1 flex flex-col">
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
            <p className="text-sm text-slate-600 line-clamp-2">{description}</p>
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
        </div>
      </div>
    </div>
  );
}
