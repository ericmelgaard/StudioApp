import React, { useState } from 'react';
import { X, AlertCircle, ChevronDown, ChevronRight, Tag, Building2, Store, Trash2 } from 'lucide-react';
import { HierarchyData, AccessSelection } from '../../hooks/useAccessConfiguration';

interface SelectionSummaryProps {
  hierarchy: HierarchyData;
  selection: AccessSelection;
  onRemoveConcept: (id: number) => void;
  onRemoveCompany: (id: number) => void;
  onRemoveStore: (id: number) => void;
  onClearAll: () => void;
  effectiveStoreCount: number;
}

export function SelectionSummary({
  hierarchy,
  selection,
  onRemoveConcept,
  onRemoveCompany,
  onRemoveStore,
  onClearAll,
  effectiveStoreCount
}: SelectionSummaryProps) {
  const [expandedSections, setExpandedSections] = useState({
    concepts: true,
    companies: true,
    stores: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const selectedConcepts = Array.from(selection.concepts)
    .map(id => hierarchy.concepts.find(c => c.id === id))
    .filter(Boolean);

  const selectedCompanies = Array.from(selection.companies)
    .map(id => hierarchy.companies.find(c => c.id === id))
    .filter(Boolean);

  const selectedStores = Array.from(selection.stores)
    .map(id => hierarchy.stores.find(s => s.id === id))
    .filter(Boolean);

  const totalSelections = selection.concepts.size + selection.companies.size + selection.stores.size;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Access Summary</h3>
          {totalSelections > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                {effectiveStoreCount} {effectiveStoreCount === 1 ? 'Store' : 'Stores'}
              </span>
            </div>
            <p className="text-xs text-blue-700">
              Total accessible locations
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <p className="text-xs text-gray-500 mb-0.5">Concepts</p>
              <p className="text-lg font-bold text-gray-900">{selection.concepts.size}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <p className="text-xs text-gray-500 mb-0.5">Companies</p>
              <p className="text-lg font-bold text-gray-900">{selection.companies.size}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <p className="text-xs text-gray-500 mb-0.5">Stores</p>
              <p className="text-lg font-bold text-gray-900">{selection.stores.size}</p>
            </div>
          </div>
        </div>

        {totalSelections === 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-900">No access selected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Select at least one location to grant access
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedConcepts.length > 0 && (
          <div className="border-b border-gray-200 bg-white">
            <button
              onClick={() => toggleSection('concepts')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Concepts ({selectedConcepts.length})
                </span>
              </div>
              {expandedSections.concepts ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.concepts && (
              <div className="px-4 pb-3 space-y-2">
                {selectedConcepts.map(concept => {
                  if (!concept) return null;
                  const companies = hierarchy.companies.filter(c => c.concept_id === concept.id);
                  const storeCount = hierarchy.stores.filter(s =>
                    companies.some(c => c.id === s.company_id)
                  ).length;

                  return (
                    <div
                      key={concept.id}
                      className="flex items-start gap-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg group hover:border-purple-300 transition-colors"
                    >
                      <Tag className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {concept.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {companies.length} {companies.length === 1 ? 'company' : 'companies'} · {storeCount} {storeCount === 1 ? 'store' : 'stores'}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveConcept(concept.id)}
                        className="p-1 hover:bg-purple-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-purple-700" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedCompanies.length > 0 && (
          <div className="border-b border-gray-200 bg-white">
            <button
              onClick={() => toggleSection('companies')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Companies ({selectedCompanies.length})
                </span>
              </div>
              {expandedSections.companies ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.companies && (
              <div className="px-4 pb-3 space-y-2">
                {selectedCompanies.map(company => {
                  if (!company) return null;
                  const storeCount = hierarchy.stores.filter(s => s.company_id === company.id).length;
                  const concept = hierarchy.concepts.find(c => c.id === company.concept_id);

                  return (
                    <div
                      key={company.id}
                      className="flex items-start gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg group hover:border-orange-300 transition-colors"
                    >
                      <Building2 className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {company.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {concept?.name} · {storeCount} {storeCount === 1 ? 'store' : 'stores'}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveCompany(company.id)}
                        className="p-1 hover:bg-orange-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-orange-700" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedStores.length > 0 && (
          <div className="border-b border-gray-200 bg-white">
            <button
              onClick={() => toggleSection('stores')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Individual Stores ({selectedStores.length})
                </span>
              </div>
              {expandedSections.stores ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.stores && (
              <div className="px-4 pb-3 space-y-2">
                {selectedStores.map(store => {
                  if (!store) return null;
                  const company = hierarchy.companies.find(c => c.id === store.company_id);

                  return (
                    <div
                      key={store.id}
                      className="flex items-start gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg group hover:border-green-300 transition-colors"
                    >
                      <Store className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {store.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {company?.name}
                          {store.city && ` · ${store.city}, ${store.state}`}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveStore(store.id)}
                        className="p-1 hover:bg-green-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-green-700" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {totalSelections > 0 && (
          <div className="p-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-1">Hierarchical Access</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Concept access includes all companies and stores within. Company access includes all stores within.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
