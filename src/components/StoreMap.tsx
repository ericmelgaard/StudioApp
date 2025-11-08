import React, { useState } from 'react';
import { MapPin, Store, Maximize2, X } from 'lucide-react';

interface StoreLocation {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

interface StoreMapProps {
  stores: StoreLocation[];
  onStoreClick?: (store: StoreLocation) => void;
}

export default function StoreMap({ stores, onStoreClick }: StoreMapProps) {
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const storesWithCoordinates = stores.filter(s => s.latitude && s.longitude);
  const storesWithoutCoordinates = stores.filter(s => !s.latitude || !s.longitude);

  const getMapBounds = () => {
    if (storesWithCoordinates.length === 0) {
      return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    }

    const lats = storesWithCoordinates.map(s => s.latitude!);
    const lngs = storesWithCoordinates.map(s => s.longitude!);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  };

  const normalizeCoordinates = (lat: number, lng: number) => {
    const bounds = getMapBounds();
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;

    const x = ((lng - bounds.minLng) / lngRange) * 100;
    const y = ((bounds.maxLat - lat) / latRange) * 100;

    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const handleStoreClick = (store: StoreLocation) => {
    setSelectedStore(store);
    onStoreClick?.(store);
  };

  const mapContainerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white'
    : 'relative';

  const mapClass = isFullscreen
    ? 'h-screen'
    : 'h-full';

  return (
    <div className="space-y-4">
      <div className={mapContainerClass}>
        <div className={`bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border border-gray-200 ${mapClass} relative overflow-hidden`}>
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
            >
              <X size={20} />
            </button>
          )}

          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
            >
              <Maximize2 size={18} />
            </button>
          )}

          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" className="text-gray-400">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {storesWithCoordinates.length > 0 ? (
            <>
              {storesWithCoordinates.map(store => {
                const { x, y } = normalizeCoordinates(store.latitude!, store.longitude!);
                const isSelected = selectedStore?.id === store.id;

                return (
                  <button
                    key={store.id}
                    onClick={() => handleStoreClick(store)}
                    className="absolute transform -translate-x-1/2 -translate-y-full group transition-transform hover:scale-110"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <MapPin
                      className={`transition-colors ${
                        isSelected
                          ? 'text-red-600 fill-red-600'
                          : 'text-blue-600 fill-blue-600 group-hover:text-red-600 group-hover:fill-red-600'
                      }`}
                      size={32}
                    />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {store.name}
                      {store.city && store.state && (
                        <div className="text-gray-300">{store.city}, {store.state}</div>
                      )}
                    </div>
                  </button>
                );
              })}

              {selectedStore && (
                <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-md">
                  <div className="flex items-start gap-3">
                    <Store className="text-blue-600 flex-shrink-0" size={24} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{selectedStore.name}</h4>
                      {selectedStore.address && (
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedStore.address}
                          {selectedStore.city && selectedStore.state && (
                            <>, {selectedStore.city}, {selectedStore.state}</>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStore(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MapPin size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-lg font-medium">No store locations to display</p>
                <p className="text-sm mt-1">Add latitude and longitude to stores to see them on the map</p>
              </div>
            </div>
          )}
        </div>

        {storesWithCoordinates.length > 0 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs text-gray-600 shadow-sm">
            {storesWithCoordinates.length} {storesWithCoordinates.length === 1 ? 'location' : 'locations'}
          </div>
        )}
      </div>
    </div>
  );
}
