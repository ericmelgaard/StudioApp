import React, { useMemo, useState } from 'react';
import { Building2, Store, Tag, MapPin, CheckSquare, Square, Filter } from 'lucide-react';
import { HierarchyData, AccessSelection } from '../../hooks/useAccessConfiguration';

interface DetailViewProps {
  hierarchy: HierarchyData;
  selection: AccessSelection;
  selectedItem: { type: 'concept' | 'company' | 'store' | null; id: number | null };
  onToggleStore: (id: number) => void;
  onSelectAllStores: (type: 'concept' | 'company', id: number) => void;
}

export function DetailView({
  hierarchy,
  selection,
  selectedItem,
  onToggleStore,
  onSelectAllStores
}: DetailViewProps) {
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const detailContent = useMemo(() => {
    if (!selectedItem.type || !selectedItem.id) {
      return null;
    }

    if (selectedItem.type === 'concept') {
      const concept = hierarchy.concepts.find(c => c.id === selectedItem.id);
      if (!concept) return null;

      const companies = hierarchy.companies.filter(c => c.concept_id === concept.id);
      let stores = hierarchy.stores.filter(s =>
        companies.some(c => c.id === s.company_id)
      );

      if (showActiveOnly) {
        stores = stores.filter(s => s.operation_status !== 'inactive');
      }

      const isConceptSelected = selection.concepts.has(concept.id);

      return {
        title: concept.name,
        subtitle: 'Concept',
        icon: <Tag className="w-6 h-6 text-purple-600" />,
        stats: [
          { label: 'Companies', value: companies.length },
          { label: 'Total Stores', value: stores.length }
        ],
        stores,
        canSelectAll: true,
        allSelected: isConceptSelected
      };
    }

    if (selectedItem.type === 'company') {
      const company = hierarchy.companies.find(c => c.id === selectedItem.id);
      if (!company) return null;

      let stores = hierarchy.stores.filter(s => s.company_id === company.id);

      if (showActiveOnly) {
        stores = stores.filter(s => s.operation_status !== 'inactive');
      }

      const isCompanySelected = selection.companies.has(company.id);
      const concept = hierarchy.concepts.find(c => c.id === company.concept_id);

      return {
        title: company.name,
        subtitle: concept ? `Company in ${concept.name}` : 'Company',
        icon: <Building2 className="w-6 h-6 text-orange-600" />,
        stats: [
          { label: 'Stores', value: stores.length },
          ...(company.city ? [{ label: 'Location', value: `${company.city}, ${company.state}` }] : [])
        ],
        stores,
        canSelectAll: true,
        allSelected: isCompanySelected
      };
    }

    if (selectedItem.type === 'store') {
      const store = hierarchy.stores.find(s => s.id === selectedItem.id);
      if (!store) return null;

      const company = hierarchy.companies.find(c => c.id === store.company_id);
      const concept = company ? hierarchy.concepts.find(c => c.id === company.concept_id) : null;

      return {
        title: store.name,
        subtitle: company ? `Store in ${company.name}` : 'Store',
        icon: <Store className="w-6 h-6 text-green-600" />,
        stats: [
          ...(concept ? [{ label: 'Concept', value: concept.name }] : []),
          ...(company ? [{ label: 'Company', value: company.name }] : []),
          ...(store.address ? [{ label: 'Address', value: `${store.address}, ${store.city}, ${store.state} ${store.zip_code || ''}`.trim() }] : []),
          { label: 'Status', value: store.operation_status === 'inactive' ? 'Inactive' : 'Active' }
        ],
        stores: [store],
        canSelectAll: false,
        allSelected: false
      };
    }

    return null;
  }, [selectedItem, hierarchy, selection, showActiveOnly]);

  if (!detailContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
        <MapPin className="w-16 h-16 mb-4" />
        <p className="text-sm font-medium">Select an item to view details</p>
        <p className="text-xs text-gray-400 mt-1 text-center">
          Click on any concept, company, or store in the tree browser
        </p>
      </div>
    );
  }

  const selectedStoreCount = detailContent.stores.filter(s =>
    selection.stores.has(s.id)
  ).length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            {detailContent.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {detailContent.title}
            </h3>
            <p className="text-sm text-gray-500">
              {detailContent.subtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {detailContent.stats.map((stat, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {detailContent.canSelectAll && detailContent.stores.length > 0 && (
          <button
            onClick={() => {
              if (selectedItem.type && selectedItem.id) {
                onSelectAllStores(selectedItem.type as 'concept' | 'company', selectedItem.id);
              }
            }}
            disabled={detailContent.allSelected}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {detailContent.allSelected ? 'Full Access Granted' : `Select All ${detailContent.stores.length} Stores`}
          </button>
        )}
      </div>

      {detailContent.stores.length > 0 && selectedItem.type !== 'store' && (
        <>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Stores</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedStoreCount} of {detailContent.stores.length} selected
                </p>
              </div>
              <button
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  showActiveOnly
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3 h-3" />
                Active Only
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {detailContent.stores.map(store => {
                const isSelected = selection.stores.has(store.id);

                return (
                  <div
                    key={store.id}
                    onClick={() => onToggleStore(store.id)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStore(store.id);
                      }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                      )}
                    </button>

                    <Store className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {store.name}
                        </span>
                        {store.operation_status === 'inactive' && (
                          <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded flex-shrink-0">
                            Inactive
                          </span>
                        )}
                      </div>
                      {store.address && (
                        <p className="text-xs text-gray-500">
                          {store.address}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {store.city}, {store.state} {store.zip_code}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
