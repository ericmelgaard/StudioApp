import React, { useState } from 'react';
import { Search, Edit, ArrowRight, Store, MapPin, Phone, Navigation } from 'lucide-react';

interface StoreData {
  id: string;
  company_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface StoresGridProps {
  stores: StoreData[];
  onEdit: (store: StoreData) => void;
  onSelect: (store: StoreData) => void;
}

export default function StoresGrid({ stores, onEdit, onSelect }: StoresGridProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store.address?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (store.city?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (store.state?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatAddress = (store: StoreData) => {
    const parts = [];
    if (store.city) parts.push(store.city);
    if (store.state) parts.push(store.state);
    return parts.join(', ') || 'No address';
  };

  const hasCoordinates = (store: StoreData) => {
    return store.latitude !== null && store.latitude !== undefined &&
           store.longitude !== null && store.longitude !== undefined;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search stores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filteredStores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Store size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No stores found</p>
          <p className="text-sm mt-1">
            {searchTerm ? 'Try adjusting your search' : 'Click "Add Store" to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Map Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStores.map((store) => (
                  <tr
                    key={store.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <Store size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{store.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                          {store.address && (
                            <div>{store.address}</div>
                          )}
                          <div>{formatAddress(store)}</div>
                          {store.zip_code && (
                            <div className="text-gray-500">{store.zip_code}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {store.phone ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} className="flex-shrink-0" />
                          <span>{store.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No phone</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {hasCoordinates(store) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <Navigation size={12} />
                            On Map
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                            <MapPin size={12} />
                            No Coords
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(store);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit store"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => onSelect(store)}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Configure
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
