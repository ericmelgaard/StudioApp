import { useState, useEffect, useMemo } from 'react';
import { X, Search, MapPin, Phone, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuLocation {
  id: number;
  name: string;
  address: {
    address1: string;
    address2: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  };
  phone: string;
}

interface QuLocationPickerProps {
  brand: string;
  onSelect: (locationId: number) => void;
  onClose: () => void;
}

export default function QuLocationPicker({ brand, onSelect, onClose }: QuLocationPickerProps) {
  const [locations, setLocations] = useState<QuLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLocations();
  }, [brand]);

  const fetchLocations = async () => {
    setLoading(true);
    setError('');

    try {
      const apiUrl = `https://qubeyond-api.wanddigital.com/integration?concept=${encodeURIComponent(brand)}&locations=true`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.statusText}`);
      }

      const data = await response.json();
      setLocations(data);
    } catch (err) {
      console.error('Error fetching Qu locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch locations from Qu API');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = async (location: QuLocation) => {
    // Store location in database for future reference
    try {
      const { error: upsertError } = await supabase
        .from('qu_locations')
        .upsert({
          id: location.id,
          name: location.name,
          address_line1: location.address.address1,
          address_line2: location.address.address2 || '',
          city: location.address.city,
          state_code: location.address.stateCode,
          postal_code: location.address.postalCode,
          country_code: location.address.countryCode,
          phone: location.phone,
          latitude: location.address.latitude,
          longitude: location.address.longitude,
          brand: brand,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.error('Error storing location:', upsertError);
        // Don't block selection if storage fails
      }
    } catch (err) {
      console.error('Error storing location:', err);
    }

    onSelect(location.id);
    onClose();
  };

  const searchLower = searchQuery.toLowerCase();

  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations;

    return locations.filter(location => {
      const searchableText = [
        location.name,
        location.address.address1,
        location.address.address2,
        location.address.city,
        location.address.stateCode,
        location.address.postalCode,
        location.phone
      ].join(' ').toLowerCase();

      return searchableText.includes(searchLower);
    });
  }, [locations, searchQuery, searchLower]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Select Qu Location</h2>
            <p className="text-sm text-slate-600 mt-1">Brand: {brand}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, address, city, state, zip, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {!loading && !error && (
            <p className="text-sm text-slate-500 mt-2">
              Showing {filteredLocations.length} of {locations.length} locations
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-slate-600">Loading locations from Qu API...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-red-800 font-medium mb-2">Error Loading Locations</p>
              <p className="text-slate-600 text-sm text-center max-w-md mb-4">{error}</p>
              <button
                onClick={fetchLocations}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No locations found matching your search</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelectLocation(location)}
                  className="text-left p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 mb-1 truncate">
                        {location.name}
                      </h3>
                      <div className="flex items-start gap-2 text-sm text-slate-600 mb-1">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div>{location.address.address1}</div>
                          {location.address.address2 && (
                            <div>{location.address.address2}</div>
                          )}
                          <div>
                            {location.address.city}, {location.address.stateCode} {location.address.postalCode}
                          </div>
                        </div>
                      </div>
                      {location.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{location.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                      ID: {location.id}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Click a location to select its establishment ID
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
