import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Layers, MapPin, Map, Sparkles, Search, ArrowUp, X, ChevronRight } from 'lucide-react';
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

interface ParentNavigationOption {
  type: 'wand' | 'concept' | 'company';
  label: string;
  icon: JSX.Element;
  onClick: () => void;
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
  const [filterQuery, setFilterQuery] = useState('');
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
          setFilterQuery('');
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsDropdownOpen(false);
          setFilterQuery('');
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

    // If userId is provided, use accessible stores from useStoreAccess hook
    if (userId && accessibleStores.length > 0) {
      const storeData = accessibleStores.map(store => ({
        id: store.id,
        name: store.name,
        company_id: store.company_id,
      }));
      setStores(storeData);
      setLoading(false);
      return;
    }

    // Special case: Store-level users should see sibling stores
    if (userStoreId) {
      // First, get the user's store to find its company
      const { data: userStore } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('id', userStoreId)
        .maybeSingle();

      if (userStore) {
        // Fetch all sibling stores in the same company
        const { data: storeData } = await supabase
          .from('stores')
          .select('id, name, company_id')
          .eq('company_id', userStore.company_id)
          .order('name');

        if (storeData) setStores(storeData);
      }
    } else if (userCompanyId && !location.concept) {
      // Company-level user at company level: show direct child stores
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('company_id', userCompanyId)
        .order('name');

      if (storeData) setStores(storeData);
    } else if (userConceptId && !location.concept) {
      // Concept-level user at concept level: show direct child companies
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, concept_id')
        .eq('concept_id', userConceptId)
        .order('name');

      if (companyData) setCompanies(companyData);
    } else if (!location.concept && !location.company && !location.store) {
      // At root: If all user IDs are null (operator mode), show only WAND Demos companies
      // Otherwise show concepts (admin mode)
      if (userConceptId === null && userCompanyId === null && userStoreId === null) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, concept_id')
          .eq('concept_id', 209)
          .order('name');

        if (companyData) setCompanies(companyData);
      } else {
        const { data: conceptData } = await supabase
          .from('concepts')
          .select('id, name')
          .order('name');

        if (conceptData) setConcepts(conceptData);
      }
    } else if (location.concept && !location.company) {
      // At concept level: show child companies
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, concept_id')
        .eq('concept_id', location.concept.id)
        .order('name');

      if (companyData) setCompanies(companyData);
    } else if (location.company && !location.store) {
      // At company level: show child stores
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('company_id', location.company.id)
        .order('name');

      if (storeData) setStores(storeData);
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

  const getParentNavigationOptions = (): ParentNavigationOption[] => {
    const options: ParentNavigationOption[] = [];

    // If at store level, add "Go to Company" if user has company access
    if (location.store && location.company) {
      // Only show if user isn't store-scoped only (store-only users can't navigate to company)
      if (!userStoreId || userCompanyId || userConceptId || (!userConceptId && !userCompanyId && !userStoreId)) {
        options.push({
          type: 'company',
          label: `Go to ${location.company.name}`,
          icon: getLocationIcon('company', "w-4 h-4 flex-shrink-0"),
          onClick: () => setLocation({ concept: location.concept, company: location.company })
        });
      }
    }

    // If at company level, add "Go to Concept" if user has concept access
    if (location.company && location.concept && !location.store) {
      // Only show if user isn't company-scoped only
      if (!userCompanyId || userConceptId || (!userConceptId && !userCompanyId && !userStoreId)) {
        options.push({
          type: 'concept',
          label: `Go to ${location.concept.name}`,
          icon: getLocationIcon('concept', "w-4 h-4 flex-shrink-0"),
          onClick: () => setLocation({ concept: location.concept })
        });
      }
    }

    // If at concept level, add "Go to WAND Digital" if user is admin
    if (location.concept && !location.company && !location.store) {
      // Only show for admin users (no scope restrictions)
      if (!userConceptId && !userCompanyId && !userStoreId) {
        options.push({
          type: 'wand',
          label: 'Go to WAND Digital',
          icon: getLocationIcon('wand', "w-4 h-4 flex-shrink-0"),
          onClick: () => setLocation({})
        });
      }
    }

    return options;
  };

  // Determine what to show based on what data was loaded
  // These should match the logic in loadNavigationData
  const showConcepts = concepts.length > 0;
  const showCompanies = companies.length > 0;
  const showStores = stores.length > 0;

  // Show dropdown if we have any locations OR parent navigation options
  const hasLocationContent = showConcepts || showCompanies || showStores;
  const parentNavOptions = getParentNavigationOptions();
  const hasDropdownContent = hasLocationContent || parentNavOptions.length > 0;

  // Only show filter if there are multiple locations to filter through
  const hasMultipleLocations =
    (showConcepts && concepts.length > 1) ||
    (showCompanies && companies.length > 1) ||
    (showStores && stores.length > 1);

  // Filter logic
  const filterLower = filterQuery.toLowerCase();
  const filteredConcepts = concepts.filter(c => c.name.toLowerCase().includes(filterLower));
  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(filterLower));
  const filteredStores = stores.filter(s => s.name.toLowerCase().includes(filterLower));

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
    setFilterQuery('');
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

  // Build breadcrumb for mobile
  const getBreadcrumb = () => {
    const parts = [];
    parts.push('WAND Digital');
    if (location.concept) parts.push(location.concept.name);
    if (location.company) parts.push(location.company.name);
    if (location.store) parts.push(location.store.name);
    return parts;
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
            {/* Parent Navigation Options */}
            {parentNavOptions.length > 0 && (
              <div className="p-2 border-b border-slate-200 bg-slate-50">
                {parentNavOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      option.onClick();
                      handleCloseDropdown();
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white rounded transition-colors flex items-center gap-2 text-blue-600 font-medium"
                  >
                    <ArrowUp className="w-4 h-4 flex-shrink-0" />
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Filter Input - Only show if there are locations to filter */}
            {hasMultipleLocations && (
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Filter locations..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            {hasLocationContent && (
              <div className="max-h-80 overflow-y-auto py-1">
                {showConcepts && filteredConcepts.map((concept) => (
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

                {showCompanies && filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSelectLocation({ company })}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                      location.company?.id === company.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {getLocationIcon('company', "w-4 h-4 flex-shrink-0")}
                    <span className="truncate">{company.name}</span>
                  </button>
                ))}

                {showStores && filteredStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSelectLocation({ concept: location.concept, company: location.company, store })}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                      location.store?.id === store.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {getLocationIcon('store', "w-4 h-4 flex-shrink-0")}
                    <span className="truncate">{store.name}</span>
                  </button>
                ))}
              </div>
            )}
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
                {getCurrentDisplayName()}
              </span>
            </div>
            <button
              onClick={handleCloseDropdown}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Non-clickable Breadcrumb */}
          {(location.concept || location.company || location.store) && (
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-sm text-slate-600 flex-wrap">
                {getBreadcrumb().map((part, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className={index === getBreadcrumb().length - 1 ? 'font-medium text-slate-900' : ''}>
                      {part}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parent Navigation Options */}
          {parentNavOptions.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 space-y-2">
              {parentNavOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    option.onClick();
                    handleCloseDropdown();
                  }}
                  className="w-full text-left px-4 py-3 bg-white hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-3 text-blue-600 font-medium border border-slate-200"
                  style={{ minHeight: '44px' }}
                >
                  <ArrowUp className="w-5 h-5 flex-shrink-0" />
                  {getLocationIcon(option.type, "w-5 h-5")}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Filter Input - Only show if there are locations to filter */}
          {hasMultipleLocations && (
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Filter locations..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          {hasLocationContent && (
            <div className="flex-1 overflow-y-auto">
              {showConcepts && filteredConcepts.map((concept) => (
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

              {showCompanies && filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelectLocation({ company })}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 ${
                    location.company?.id === company.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  {getLocationIcon('company', "w-5 h-5 flex-shrink-0")}
                  <span className="text-base">{company.name}</span>
                </button>
              ))}

              {showStores && filteredStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleSelectLocation({ concept: location.concept, company: location.company, store })}
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
