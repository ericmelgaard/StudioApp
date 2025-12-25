import { useState, useEffect } from 'react';
import { ChevronDown, Building2, Layers, MapPin, Map, Sparkles, Search, ArrowUp, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLocation } from '../hooks/useLocation';

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
  onOpenFullNavigator: () => void;
  actionButton?: React.ReactNode;
  contextId?: number | string;
  contextLabel?: string;
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
  onOpenFullNavigator,
  actionButton,
  contextId,
  contextLabel = 'ID'
}: HeaderNavigationProps) {
  const { location, setLocation } = useLocation();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    loadNavigationData();
  }, [userConceptId, userCompanyId, userStoreId, location]);

  const loadNavigationData = async () => {
    setLoading(true);

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
      // Admin at root: show all concepts
      const { data: conceptData } = await supabase
        .from('concepts')
        .select('id, name')
        .order('name');

      if (conceptData) setConcepts(conceptData);
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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const copyIdToClipboard = () => {
    if (contextId) {
      navigator.clipboard.writeText(String(contextId));
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg transition-colors border border-slate-200"
        >
          {getCurrentIcon()}
          <span className="text-sm font-medium text-slate-900 max-w-[360px] truncate">
            {loading ? 'Loading...' : getCurrentDisplayName()}
          </span>
          {hasDropdownContent && <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {hasDropdownContent && isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-[960px] bg-white rounded-lg shadow-lg border border-slate-200 transition-all max-h-[32rem] overflow-hidden z-50">
            {/* Parent Navigation Options */}
            {parentNavOptions.length > 0 && (
              <div className="p-2 border-b border-slate-200 bg-slate-50">
                {parentNavOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      option.onClick();
                      setIsDropdownOpen(false);
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
                    onClick={() => {
                      setLocation({ concept });
                      setIsDropdownOpen(false);
                    }}
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
                    onClick={() => {
                      setLocation({
                        concept: location.concept,
                        company
                      });
                      setIsDropdownOpen(false);
                    }}
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
                    onClick={() => {
                      setLocation({
                        concept: location.concept,
                        company: location.company,
                        store
                      });
                      setIsDropdownOpen(false);
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
            )}
          </div>
        )}
      </div>

      {/* Map Icon Button */}
      <button
        onClick={onOpenFullNavigator}
        className="flex items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        title="Open full navigation"
      >
        <Map className="w-4 h-4 text-slate-600" />
      </button>

      {/* Context ID Badge */}
      {contextId && (
        <button
          onClick={copyIdToClipboard}
          className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors text-xs font-mono border border-slate-200"
          title="Click to copy ID"
        >
          {idCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{contextLabel}: {contextId}</span>
            </>
          )}
        </button>
      )}

      {/* Action Button */}
      {actionButton && actionButton}
    </div>
  );
}
