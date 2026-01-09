import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Layers, MapPin, Map, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLocation } from '../hooks/useLocation';
import { useStoreAccess } from '../hooks/useStoreAccess';

interface Concept {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
  concept_id: number;
}

interface Store {
  id: number;
  name: string;
  company_id: number;
}

interface HeaderNavigationProps {
  userConceptId?: number | null;
  userCompanyId?: number | null;
  userStoreId?: number | null;
  userId?: string | null;
  onOpenFullNavigator: () => void;
  actionButton?: React.ReactNode;
}

// Standardized icon mapping for location hierarchy
const getLocationIcon = (level: 'wand' | 'concept' | 'company' | 'store', className = "w-4 h-4") => {
  switch (level) {
    case 'wand':
      return <Sparkles className={className} />;
    case 'concept':
      return <Building2 className={className} />;
    case 'company':
      return <Layers className={className} />;
    case 'store':
      return <MapPin className={className} />;
  }
};

export default function HeaderNavigation({
  userConceptId,
  userCompanyId,
  userStoreId,
  userId,
  onOpenFullNavigator,
  actionButton
}: HeaderNavigationProps) {
  const { location, setLocation } = useLocation();
  const { accessibleStores, loading: storesLoading } = useStoreAccess({ userId });
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storesLoading) {
      loadNavigationData();
    }
  }, [userConceptId, userCompanyId, userStoreId, userId, location, accessibleStores, storesLoading]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Click-outside detection for desktop
  useEffect(() => {
    if (!isMobile && isDropdownOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false);
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsDropdownOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isDropdownOpen, isMobile]);

  // Body scroll lock for mobile modal
  useEffect(() => {
    if (isMobile && isDropdownOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, isDropdownOpen]);

  const loadNavigationData = async () => {
    if (storesLoading) return;

    setLoading(true);

    // Quick nav works like breadcrumb navigation:
    // Root (WAND) -> Concepts (children)
    // Concept -> Companies (children)
    // Company -> Stores (children) - root for store navigation
    // Store -> Stores (siblings in same company)

    if (location.store) {
      // At a store: show sibling stores in the same company
      const companyId = location.company?.id;
      if (companyId) {
        const { data: storesData } = await supabase
          .from('stores')
          .select('id, name, company_id')
          .eq('company_id', companyId)
          .order('name');

        if (storesData) {
          setStores(storesData);
          setConcepts([]);
          setCompanies(location.company ? [location.company] : []);
        }
      }
    } else if (location.company) {
      // At a company: show child stores (acts as root for store navigation)
      const companyId = location.company.id;
      const { data: storesData } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('company_id', companyId)
        .order('name');

      if (storesData) {
        setStores(storesData);
        setConcepts([]);
        setCompanies([location.company]);
      }
    } else if (location.concept) {
      // At a concept: show child companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, concept_id')
        .eq('concept_id', location.concept.id)
        .order('name');

      if (companiesData) {
        setCompanies(companiesData);
        setConcepts([]);
        setStores([]);
      }
    } else {
      // At root (WAND Digital): show child concepts
      const { data: conceptsData } = await supabase
        .from('concepts')
        .select('id, name')
        .order('name');

      if (conceptsData) {
        setConcepts(conceptsData);
        setCompanies([]);
        setStores([]);
      }
    }

    setLoading(false);
  };

  const getCurrentDisplayName = (): string => {
    if (location.store) return location.store.name;
    if (location.company) return location.company.name;
    if (location.concept) return location.concept.name;
    return 'WAND Digital';
  };

  const getCurrentIcon = () => {
    if (location.store) return getLocationIcon('store', "w-4 h-4 text-slate-600");
    if (location.company) return getLocationIcon('company', "w-4 h-4 text-slate-600");
    if (location.concept) return getLocationIcon('concept', "w-4 h-4 text-slate-600");
    return getLocationIcon('wand', "w-4 h-4 text-slate-600");
  };

  // Quick nav shows different content based on location level
  const showConcepts = concepts.length > 0;
  const showCompanies = companies.length > 0 && stores.length === 0;
  const showStores = stores.length > 0;

  // Show dropdown if we have any content
  const hasLocationContent = showConcepts || showCompanies || showStores;
  const hasDropdownContent = hasLocationContent;

  // Group stores by company for display
  const storesByCompany = stores.reduce((acc, store) => {
    if (!acc[store.company_id]) {
      acc[store.company_id] = [];
    }
    acc[store.company_id].push(store);
    return acc;
  }, {} as Record<number, Store[]>);

  // Get companies in order
  const companiesWithStores = companies
    .filter(c => storesByCompany[c.id])
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleSelectLocation = async (newLocation: { concept?: Concept; company?: Company; store?: Store }) => {
    // If selecting a company without a concept, fetch the concept data
    if (newLocation.company && !newLocation.concept) {
      const { data: conceptData } = await supabase
        .from('concepts')
        .select('id, name')
        .eq('id', newLocation.company.concept_id)
        .maybeSingle();

      if (conceptData) {
        setLocation({ concept: conceptData, company: newLocation.company, store: newLocation.store });
      } else {
        setLocation(newLocation);
      }
    } else {
      setLocation(newLocation);
    }
    handleCloseDropdown();
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg transition-colors border border-slate-200"
        >
          {getCurrentIcon()}
          <span className="text-sm font-medium text-slate-900 max-w-[200px] truncate">
            {loading ? 'Loading...' : getCurrentDisplayName()}
          </span>
          {hasDropdownContent && <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Desktop Dropdown */}
        {!isMobile && hasDropdownContent && isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-[360px] bg-white rounded-lg shadow-lg border border-slate-200 transition-all max-h-[32rem] overflow-hidden z-50">
            <div className="max-h-80 overflow-y-auto">
              {/* Show Concepts (at root) */}
              {showConcepts && (
                <div className="py-1">
                  {concepts.map((concept) => (
                    <button
                      key={concept.id}
                      onClick={() => handleSelectLocation({ concept })}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                        location.concept?.id === concept.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {getLocationIcon('concept', "w-4 h-4 flex-shrink-0")}
                      <span className="truncate">{concept.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Show Companies (at concept level) */}
              {showCompanies && (
                <div className="py-1">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={async () => {
                        const { data: conceptData } = await supabase
                          .from('concepts')
                          .select('id, name')
                          .eq('id', company.concept_id)
                          .maybeSingle();

                        handleSelectLocation({
                          concept: conceptData || undefined,
                          company
                        });
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                        location.company?.id === company.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {getLocationIcon('company', "w-4 h-4 flex-shrink-0")}
                      <span className="truncate">{company.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Show Stores (at company/store level) */}
              {showStores && (
                <>
                  {companiesWithStores.map((company) => (
                    <div key={company.id}>
                      {/* Company Header (non-clickable) */}
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          {getLocationIcon('company', "w-4 h-4 text-slate-500")}
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                            {company.name}
                          </span>
                        </div>
                      </div>

                      {/* Stores in this company */}
                      <div className="py-1">
                        {storesByCompany[company.id]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((store) => (
                            <button
                              key={store.id}
                              onClick={async () => {
                                // Fetch concept for this store's company
                                const { data: conceptData } = await supabase
                                  .from('concepts')
                                  .select('id, name')
                                  .eq('id', company.concept_id)
                                  .maybeSingle();

                                handleSelectLocation({
                                  concept: conceptData || undefined,
                                  company,
                                  store
                                });
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                                location.store?.id === store.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                              }`}
                            >
                              {getLocationIcon('store', "w-4 h-4 flex-shrink-0")}
                              <span className="truncate">{store.name}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Full-Screen Modal */}
      {isMobile && hasDropdownContent && isDropdownOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getCurrentIcon()}
              <span className="text-base font-semibold text-slate-900 truncate">
                Quick Navigation
              </span>
            </div>
            <button
              onClick={handleCloseDropdown}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Scrollable Content */}
          {hasLocationContent && (
            <div className="flex-1 overflow-y-auto">
              {/* Show Concepts (at root) */}
              {showConcepts && concepts.map((concept) => (
                <button
                  key={concept.id}
                  onClick={() => handleSelectLocation({ concept })}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 ${
                    location.concept?.id === concept.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  {getLocationIcon('concept', "w-5 h-5 flex-shrink-0")}
                  <span className="text-base">{concept.name}</span>
                </button>
              ))}

              {/* Show Companies (at concept level) */}
              {showCompanies && companies.map((company) => (
                <button
                  key={company.id}
                  onClick={async () => {
                    const { data: conceptData } = await supabase
                      .from('concepts')
                      .select('id, name')
                      .eq('id', company.concept_id)
                      .maybeSingle();

                    handleSelectLocation({
                      concept: conceptData || undefined,
                      company
                    });
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 ${
                    location.company?.id === company.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  {getLocationIcon('company', "w-5 h-5 flex-shrink-0")}
                  <span className="text-base">{company.name}</span>
                </button>
              ))}

              {/* Show Stores (at company/store level) */}
              {showStores && companiesWithStores.map((company) => (
                <div key={company.id}>
                  {/* Company Header (non-clickable) */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 sticky top-0">
                    <div className="flex items-center gap-2">
                      {getLocationIcon('company', "w-5 h-5 text-slate-500")}
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                        {company.name}
                      </span>
                    </div>
                  </div>

                  {/* Stores in this company */}
                  {storesByCompany[company.id]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((store) => (
                      <button
                        key={store.id}
                        onClick={async () => {
                          // Fetch concept for this store's company
                          const { data: conceptData } = await supabase
                            .from('concepts')
                            .select('id, name')
                            .eq('id', company.concept_id)
                            .maybeSingle();

                          handleSelectLocation({
                            concept: conceptData || undefined,
                            company,
                            store
                          });
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 ${
                          location.store?.id === store.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                        }`}
                        style={{ minHeight: '44px' }}
                      >
                        {getLocationIcon('store', "w-5 h-5 flex-shrink-0")}
                        <span className="text-base">{store.name}</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Icon Button - Hidden on mobile */}
      <button
        onClick={onOpenFullNavigator}
        className="hidden md:flex items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        title="Open full navigation"
      >
        <Map className="w-4 h-4 text-slate-600" />
      </button>

      {/* Action Button */}
      {actionButton && actionButton}
    </div>
  );
}
