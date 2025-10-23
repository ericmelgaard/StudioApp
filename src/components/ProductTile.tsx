import { useState } from 'react';

interface Product {
  mrn: string;
  name: string;
  description: string | null;
  price: string | null;
  calories: string | null;
  portion: string | null;
  meal_periods: Array<{ period: string; date: string }>;
  meal_stations: Array<{ station: string; station_detail: any }>;
  image_url?: string;
}

interface ProductTileProps {
  product: Product;
}

export default function ProductTile({ product }: ProductTileProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {product.image_url ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isHovered ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <div
            className={`absolute inset-0 bg-white p-4 flex flex-col justify-between transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                {product.name}
              </h3>
              <p className="text-xs text-slate-500">MRN: {product.mrn}</p>
              {product.description && (
                <p className="text-xs text-slate-600 line-clamp-3">{product.description}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">
                  {product.price && parseFloat(product.price) > 0 ? `$${product.price}` : 'Included'}
                </span>
                {product.calories && (
                  <span className="text-slate-600">{product.calories} cal</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-4">
        {!product.image_url && (
          <>
            <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
              {product.name}
            </h3>
            <p className="text-xs text-slate-500 mb-3">MRN: {product.mrn}</p>
          </>
        )}

        {product.image_url && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {product.price && parseFloat(product.price) > 0 ? `$${product.price}` : 'Included'}
              </span>
              {product.calories && (
                <span className="text-sm text-slate-600">{product.calories} cal</span>
              )}
            </div>
          </div>
        )}

        {!product.image_url && (
          <div className="space-y-3">
            {product.description && (
              <p className="text-sm text-slate-600 line-clamp-2">{product.description}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {product.price && parseFloat(product.price) > 0 ? `$${product.price}` : 'Included'}
              </span>
              {product.calories && (
                <span className="text-sm text-slate-600">{product.calories} cal</span>
              )}
            </div>

            {product.meal_periods && product.meal_periods.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.meal_periods.slice(0, 2).map((mp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {mp.period}
                  </span>
                ))}
                {product.meal_periods.length > 2 && (
                  <span className="text-xs text-slate-500">
                    +{product.meal_periods.length - 2}
                  </span>
                )}
              </div>
            )}

            {product.meal_stations && product.meal_stations.length > 0 && (
              <div className="text-xs text-slate-600">
                <span className="font-medium">Station:</span>{' '}
                {product.meal_stations[0].station}
                {product.meal_stations.length > 1 && ` +${product.meal_stations.length - 1}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
