import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, CheckSquare, Square, Building2, Store, Tag } from 'lucide-react';
import { HierarchyData, AccessSelection } from '../../hooks/useAccessConfiguration';

interface TreeBrowserProps {
  hierarchy: HierarchyData;
  selection: AccessSelection;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onToggleConcept: (id: number) => void;
  onToggleCompany: (id: number) => void;
  onToggleStore: (id: number) => void;
  onSelectItem: (item: { type: 'concept' | 'company' | 'store' | null; id: number | null }) => void;
  selectedItem: { type: 'concept' | 'company' | 'store' | null; id: number | null };
}

export function TreeBrowser({
  hierarchy,
  selection,
  searchTerm,
  onSearchChange,
  onToggleConcept,
  onToggleCompany,
  onToggleStore,
  onSelectItem,
  selectedItem
}: TreeBrowserProps) {
  const [expandedConcepts, setExpandedConcepts] = useState<Set<number>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const filteredHierarchy = useMemo(() => {
    if (!searchTerm.trim()) return hierarchy;

    const term = searchTerm.toLowerCase();
    const matchingStores = hierarchy.stores.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.city?.toLowerCase().includes(term) ||
      s.state?.toLowerCase().includes(term)
    );
    const matchingCompanies = hierarchy.companies.filter(c =>
      c.name.toLowerCase().includes(term) ||
      matchingStores.some(s => s.company_id === c.id)
    );
    const matchingConcepts = hierarchy.concepts.filter(co =>
      co.name.toLowerCase().includes(term) ||
      matchingCompanies.some(c => c.concept_id === co.id)
    );

    return {
      concepts: matchingConcepts,
      companies: matchingCompanies,
      stores: matchingStores
    };
  }, [hierarchy, searchTerm]);

  const toggleConceptExpansion = (conceptId: number) => {
    setExpandedConcepts(prev => {
      const next = new Set(prev);
      if (next.has(conceptId)) {
        next.delete(conceptId);
      } else {
        next.add(conceptId);
      }
      return next;
    });
  };

  const toggleCompanyExpansion = (companyId: number) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const getCompaniesForConcept = (conceptId: number) => {
    return filteredHierarchy.companies.filter(c => c.concept_id === conceptId);
  };

  const getStoresForCompany = (companyId: number) => {
    return filteredHierarchy.stores.filter(s => s.company_id === companyId);
  };

  const getConceptCompanyCount = (conceptId: number) => {
    return hierarchy.companies.filter(c => c.concept_id === conceptId).length;
  };

  const getConceptStoreCount = (conceptId: number) => {
    const companies = hierarchy.companies.filter(c => c.concept_id === conceptId);
    return hierarchy.stores.filter(s => companies.some(c => c.id === s.company_id)).length;
  };

  const getCompanyStoreCount = (companyId: number) => {
    return hierarchy.stores.filter(s => s.company_id === companyId).length;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Browse Hierarchy</h3>
          <button
            onClick={() => {
              if (expandAll) {
                setExpandedConcepts(new Set());
                setExpandedCompanies(new Set());
              } else {
                setExpandedConcepts(new Set(hierarchy.concepts.map(c => c.id)));
                setExpandedCompanies(new Set(hierarchy.companies.map(c => c.id)));
              }
              setExpandAll(!expandAll);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search concepts, companies, or stores..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {searchTerm && (
          <p className="text-xs text-gray-500 mt-2">
            Found {filteredHierarchy.concepts.length} concepts, {filteredHierarchy.companies.length} companies, {filteredHierarchy.stores.length} stores
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredHierarchy.concepts.map(concept => {
            const companies = getCompaniesForConcept(concept.id);
            const isExpanded = expandedConcepts.has(concept.id);
            const isSelected = selection.concepts.has(concept.id);
            const companyCount = getConceptCompanyCount(concept.id);
            const storeCount = getConceptStoreCount(concept.id);

            return (
              <div key={concept.id} className="mb-1">
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group transition-colors ${
                    selectedItem.type === 'concept' && selectedItem.id === concept.id ? 'bg-blue-50 ring-2 ring-blue-200' : ''
                  }`}
                  onClick={() => onSelectItem({ type: 'concept', id: concept.id })}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleConceptExpansion(concept.id);
                    }}
                    className="p-1 hover:bg-gray-300 rounded transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-700" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleConcept(concept.id);
                    }}
                    className="flex-shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    )}
                  </button>

                  <Tag className="w-4 h-4 text-purple-600 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {concept.name}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                          Full Access
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {companyCount} {companyCount === 1 ? 'company' : 'companies'} · {storeCount} {storeCount === 1 ? 'store' : 'stores'}
                    </p>
                  </div>
                </div>

                {isExpanded && companies.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {companies.map(company => {
                      const stores = getStoresForCompany(company.id);
                      const isCompanyExpanded = expandedCompanies.has(company.id);
                      const isCompanySelected = selection.companies.has(company.id);
                      const companyStoreCount = getCompanyStoreCount(company.id);

                      return (
                        <div key={company.id}>
                          <div
                            className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group transition-colors ${
                              selectedItem.type === 'company' && selectedItem.id === company.id ? 'bg-blue-50 ring-2 ring-blue-200' : ''
                            }`}
                            onClick={() => onSelectItem({ type: 'company', id: company.id })}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompanyExpansion(company.id);
                              }}
                              className="p-1 hover:bg-gray-300 rounded transition-colors"
                              title={isCompanyExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isCompanyExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-700" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-700" />
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCompany(company.id);
                              }}
                              className="flex-shrink-0"
                            >
                              {isCompanySelected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                              )}
                            </button>

                            <Building2 className="w-4 h-4 text-orange-600 flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {company.name}
                                </span>
                                {isCompanySelected && (
                                  <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                                    Full Access
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {companyStoreCount} {companyStoreCount === 1 ? 'store' : 'stores'}
                                {company.city && ` · ${company.city}, ${company.state}`}
                              </p>
                            </div>
                          </div>

                          {isCompanyExpanded && stores.length > 0 && (
                            <div className="ml-6 mt-1 space-y-1">
                              {stores.map(store => {
                                const isStoreSelected = selection.stores.has(store.id);

                                return (
                                  <div
                                    key={store.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group transition-colors ${
                                      selectedItem.type === 'store' && selectedItem.id === store.id ? 'bg-blue-50 ring-2 ring-blue-200' : ''
                                    }`}
                                    onClick={() => onSelectItem({ type: 'store', id: store.id })}
                                  >
                                    <div className="w-4" />

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleStore(store.id);
                                      }}
                                      className="flex-shrink-0"
                                    >
                                      {isStoreSelected ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                      ) : (
                                        <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                                      )}
                                    </button>

                                    <Store className="w-4 h-4 text-green-600 flex-shrink-0" />

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-900 truncate">
                                          {store.name}
                                        </span>
                                        {store.operation_status === 'inactive' && (
                                          <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 truncate">
                                        {store.address && `${store.address}, `}
                                        {store.city}, {store.state}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredHierarchy.concepts.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No results found' : 'No concepts available'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
