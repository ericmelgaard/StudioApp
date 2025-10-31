import { useState, useEffect } from 'react';
import { Calendar, Calculator, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_mappings?: Record<string, any>;
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

  const displayName = product.attributes?.name || product.name;
  const imageUrl = product.attributes?.thumbnail || product.attributes?.image_url;
  const description = product.attributes?.description;
  const price = product.attributes?.price;
  const calories = product.attributes?.calories;
  const portion = product.attributes?.portion;
  const mealPeriods = product.attributes?.meal_periods;
  const mealStations = product.attributes?.meal_stations;
  const sizes = product.attributes?.sizes;

  const fieldLinks = product.attribute_mappings || {};
  const priceLink = fieldLinks['price'];
  const hasCalculation = priceLink?.type === 'calculation';

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {imageUrl && (
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          {pendingPublication && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500 text-white rounded-lg shadow-lg text-xs font-medium">
              <Calendar className="w-3.5 h-3.5" />
              Scheduled
            </div>
          )}
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
              <div className="relative">
                <div className={`text-xs font-semibold px-3 py-1.5 rounded border ${
                  priceLink ? 'border-green-400 bg-green-50 pr-20' : 'border-slate-300 bg-white'
                }`}>
                  {price ? `$${price}` : 'N/A'}
                </div>
                {priceLink && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-green-700">
                    {hasCalculation ? <Calculator className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                    {hasCalculation ? 'Calculated' : 'Synced'}
                  </div>
                )}
              </div>
              {hasCalculation && priceLink.calculation && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <p className="text-[10px] font-medium text-slate-600 mb-1">Combo Pricing:</p>
                  <div className="space-y-1">
                    {priceLink.calculation.map((part: any, index: number) => {
                      const isSubtract = index > 0 && part.operation === 'subtract';
                      return (
                        <div key={part.id} className="flex items-center gap-1 text-[10px]">
                          {index > 0 && (
                            <span className={`font-bold w-3 text-center ${
                              part.operation === 'subtract' ? 'text-red-600' : 'text-slate-600'
                            }`}>
                              {part.operation === 'add' ? '+' : '−'}
                            </span>
                          )}
                          {index === 0 && <span className="w-3"></span>}
                          <div className="flex-1 flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200">
                            <span className={`font-medium ${isSubtract ? 'text-red-700' : 'text-slate-700'}`}>
                              {part.productName}
                            </span>
                            <span className={`font-semibold ${isSubtract ? 'text-red-700' : 'text-slate-900'}`}>
                              ${typeof part.value === 'number' ? part.value.toFixed(2) : part.value}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {calories && (
                <span className="text-xs text-slate-600">{calories} cal</span>
              )}
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

          {!imageUrl && (
            <div className="space-y-2">
              <div className="relative">
                <div className={`text-sm font-semibold px-3 py-1.5 rounded border ${
                  priceLink ? 'border-green-400 bg-green-50 pr-20' : 'border-slate-300 bg-white'
                }`}>
                  {price ? `$${price}` : 'N/A'}
                </div>
                {priceLink && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-green-700">
                    {hasCalculation ? <Calculator className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                    {hasCalculation ? 'Calculated' : 'Synced'}
                  </div>
                )}
              </div>

              {hasCalculation && priceLink.calculation && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">Combo Pricing:</p>
                  <div className="space-y-1">
                    {priceLink.calculation.map((part: any, index: number) => {
                      const isSubtract = index > 0 && part.operation === 'subtract';
                      return (
                        <div key={part.id} className="flex items-center gap-2 text-sm">
                          {index > 0 && (
                            <span className={`font-bold w-4 text-center ${
                              part.operation === 'subtract' ? 'text-red-600' : 'text-slate-600'
                            }`}>
                              {part.operation === 'add' ? '+' : '−'}
                            </span>
                          )}
                          {index === 0 && <span className="w-4"></span>}
                          <div className="flex-1 flex items-center justify-between bg-white px-3 py-1.5 rounded border border-slate-200">
                            <span className={`font-medium ${isSubtract ? 'text-red-700' : 'text-slate-700'}`}>
                              {part.productName}
                            </span>
                            <span className={`font-semibold ${isSubtract ? 'text-red-700' : 'text-slate-900'}`}>
                              ${typeof part.value === 'number' ? part.value.toFixed(2) : part.value}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {calories && (
                <div className="text-sm text-slate-600">{calories} cal</div>
              )}
            </div>
          )}

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
            <div className="space-y-2">
              {sizes.slice(0, 3).map((size: any, idx: number) => {
                const sizeLink = size.link;
                const hasSizeCalculation = sizeLink?.type === 'calculation';

                return (
                  <div key={idx} className="space-y-1">
                    <div className="relative">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        sizeLink ? 'bg-green-50 border border-green-400 text-slate-700 pr-16' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {size.label} {size.price && `$${size.price}`}
                      </span>
                      {sizeLink && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-medium text-green-700">
                          {hasSizeCalculation ? <Calculator className="w-2.5 h-2.5" /> : <Link className="w-2.5 h-2.5" />}
                          {hasSizeCalculation ? 'Calc' : 'Sync'}
                        </div>
                      )}
                    </div>
                    {hasSizeCalculation && sizeLink.calculation && (
                      <div className="bg-white border border-slate-200 rounded-lg p-2 ml-2">
                        <p className="text-[10px] font-medium text-slate-600 mb-1">Price Calculation:</p>
                        <div className="space-y-0.5">
                          {sizeLink.calculation.map((part: any, partIdx: number) => {
                            const isSubtract = partIdx > 0 && part.operation === 'subtract';
                            return (
                              <div key={part.id} className="flex items-center gap-1 text-[10px]">
                                {partIdx > 0 && (
                                  <span className={`font-bold w-3 text-center ${
                                    part.operation === 'subtract' ? 'text-red-600' : 'text-slate-600'
                                  }`}>
                                    {part.operation === 'add' ? '+' : '−'}
                                  </span>
                                )}
                                {partIdx === 0 && <span className="w-3"></span>}
                                <div className="flex-1 flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                  <span className={`font-medium ${isSubtract ? 'text-red-700' : 'text-slate-700'}`}>
                                    {part.productName}
                                  </span>
                                  <span className={`font-semibold ${isSubtract ? 'text-red-700' : 'text-slate-900'}`}>
                                    ${typeof part.value === 'number' ? part.value.toFixed(2) : part.value}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {sizes.length > 3 && (
                <span className="text-xs text-slate-500">
                  +{sizes.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
