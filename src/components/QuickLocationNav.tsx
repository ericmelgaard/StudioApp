import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Layers, MapPin, Sparkles, Search, ArrowUp, X } from 'lucide-react';
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

interface QuickLocationNavProps {
  userConceptId?: number | null;
  userCompanyId?: number | null;
  userStoreId?: number | null;
}

interface ParentNavigationOption {
  type: 'wand' | 'concept' | 'company';
  label: string;
  icon: JSX.Element;
  onClick: () => void;
}

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

export default function QuickLocationNav({
  userConceptId,
  userCompanyId,
  userStoreId
}: QuickLocationNavProps) {
  const { location, setLocation } = useLocation();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadNavigationData();
  }, [userConceptId, userCompanyId, userStoreId, location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  const loadNavigationData = async () => {
    setLoading(true);

    if (userStoreId) {
      const { data: userStore } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('id', userStoreId)
        .maybeSingle();

      if (userStore) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('id, name, company_id')
          .eq('company_id', userStore.company_id)
          .order('name');

        if (storeData) setStores(storeData);
      }
    } else if (userCompanyId && !location.concept) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('company_id', userCompanyId)
        .order('name');

      if (storeData) setStores(storeData);
    } else if (userConceptId && !location.concept) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, concept_id')
        .eq('concept_id', userConceptId)
        .order('name');

      if (companyData) setCompanies(companyData);
    } else if (!location.concept && !location.company && !location.store) {
      const { data: conceptData } = await supabase
        .from('concepts')
        .select('id, name')
        .order('name');

      if (conceptData) setConcepts(conceptData);
    } else if (location.concept && !location.company) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, concept_id')
        .eq('concept_id', location.concept.id)
        .order('name');

      if (companyData) setCompanies(companyData);
    } else if (location.company && !location.store) {
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

  const getBreadcrumb = (): string => {
    const parts: string[] = ['WAND'];
    if (location.concept) parts.push(location.concept.name);
    if (location.company) parts.push(location.company.name);
    if (location.store) parts.push(location.store.name);
    return parts.join(' > ');
  };

  const getCurrentIcon = () => {
    if (location.store) return getLocationIcon('store', "w-4 h-4 text-slate-600");
    if (location.company) return getLocationIcon('company', "w-4 h-4 text-slate-600");
    if (location.concept) return getLocationIcon('concept', "w-4 h-4 text-slate-600");
    return getLocationIcon('wand', "w-4 h-4 text-slate-600");
  };

  const getParentNavigationOptions = (): ParentNavigationOption[] => {
    const options: ParentNavigationOption[] = [];

    if (location.store && location.company) {
      if (!userStoreId || userCompanyId || userConceptId || (!userConceptId && !userCompanyId && !userStoreId)) {
        options.push({
          type: 'company',
          label: `Go to ${location.company.name}`,
          icon: getLocationIcon('company', "w-4 h-4 flex-shrink-0"),
          onClick: () => setLocation({ concept: location.concept, company: location.company })
        });
      }
    }

    if (location.company && location.concept && !location.store) {
      if (!userCompanyId || userConceptId || (!userConceptId && !userCompanyId && !userStoreId)) {
        options.push({
          type: 'concept',
          label: `Go to ${location.concept.name}`,
          icon: getLocationIcon('concept', "w-4 h-4 flex-shrink-0"),
          onClick: () => setLocation({ concept: location.concept })
        });
      }
    }

    if (location.concept && !location.company && !location.store) {
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

  const showConcepts = concepts.length > 0;
  const showCompanies = companies.length > 0;
  const showStores = stores.length > 0;

  const hasLocationContent = showConcepts || showCompanies || showStores;
  const parentNavOptions = getParentNavigationOptions();
  const hasDropdownContent = hasLocationContent || parentNavOptions.length > 0;

  const hasMultipleLocations =
    (showConcepts && concepts.length > 1) ||
    (showCompanies && companies.length > 1) ||
    (showStores && stores.length > 1);

  const filterLower = filterQuery.toLowerCase();
  const filteredConcepts = concepts.filter(c => c.name.toLowerCase().includes(filterLower));
  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(filterLower));
  const filteredStores = stores.filter(s => s.name.toLowerCase().includes(filterLower));

  const handleLocationSelect = (newLocation: any) => {
    setLocation(newLocation);
    setIsOpen(false);
    setFilterQuery('');
  };

  const handleParentNav = (option: ParentNavigationOption) => {
    option.onClick();
    setIsOpen(false);
    setFilterQuery('');
  };

  const renderLocationList = () => (
    <>
      {showConcepts && filteredConcepts.map((concept) => (
        <button
          key={concept.id}
          onClick={() => handleLocationSelect({ concept })}
          className={`w-full text-left px-4 py-3 md:py-2 text-base md:text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 md:gap-2 min-h-[44px] md:min-h-0 ${
            location.concept?.id === concept.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
          }`}
        >
          {getLocationIcon('concept', "w-5 h-5 md:w-4 md:h-4 flex-shrink-0")}
          <span className="truncate">{concept.name}</span>
        </button>
      ))}

      {showCompanies && filteredCompanies.map((company) => (
        <button
          key={company.id}
          onClick={() => handleLocationSelect({ concept: location.concept, company })}
          className={`w-full text-left px-4 py-3 md:py-2 text-base md:text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 md:gap-2 min-h-[44px] md:min-h-0 ${
            location.company?.id === company.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
          }`}
        >
          {getLocationIcon('company', "w-5 h-5 md:w-4 md:h-4 flex-shrink-0")}
          <span className="truncate">{company.name}</span>
        </button>
      ))}

      {showStores && filteredStores.map((store) => (
        <button
          key={store.id}
          onClick={() => handleLocationSelect({ concept: location.concept, company: location.company, store })}
          className={`w-full text-left px-4 py-3 md:py-2 text-base md:text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 md:gap-2 min-h-[44px] md:min-h-0 ${
            location.store?.id === store.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
          }`}
        >
          {getLocationIcon('store', "w-5 h-5 md:w-4 md:h-4 flex-shrink-0")}
          <span className="truncate">{store.name}</span>
        </button>
      ))}
    </>
  );

  const renderMobileModal = () => (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">Select Location</h2>
          <p className="text-sm text-slate-600 truncate">{getBreadcrumb()}</p>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setFilterQuery('');
          }}
          className="ml-4 p-2 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-6 h-6 text-slate-600" />
        </button>
      </div>

      {parentNavOptions.length > 0 && (
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          {parentNavOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleParentNav(option)}
              className="w-full text-left px-4 py-3 text-base hover:bg-white rounded-lg transition-colors flex items-center gap-3 text-blue-600 font-medium min-h-[44px]"
            >
              <ArrowUp className="w-5 h-5 flex-shrink-0" />
              {option.icon}
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {hasMultipleLocations && (
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search locations..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {hasLocationContent && (
        <div className="flex-1 overflow-y-auto">
          {renderLocationList()}
        </div>
      )}
    </div>
  );

  const renderDesktopDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-[360px] bg-white rounded-lg shadow-lg border border-slate-200 max-h-[32rem] overflow-hidden z-50">
      {parentNavOptions.length > 0 && (
        <div className="p-2 border-b border-slate-200 bg-slate-50">
          {parentNavOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleParentNav(option)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white rounded transition-colors flex items-center gap-2 text-blue-600 font-medium"
            >
              <ArrowUp className="w-4 h-4 flex-shrink-0" />
              {option.icon}
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {hasMultipleLocations && (
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {hasLocationContent && (
        <div className="max-h-80 overflow-y-auto py-1">
          {renderLocationList()}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-50 rounded-lg transition-colors border border-slate-200 hover:bg-slate-100"
      >
        {getCurrentIcon()}
        <span className="text-sm font-medium text-slate-900 max-w-[120px] md:max-w-[200px] truncate">
          {loading ? 'Loading...' : getCurrentDisplayName()}
        </span>
        {hasDropdownContent && <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>

      {hasDropdownContent && isOpen && (
        isMobile ? renderMobileModal() : renderDesktopDropdown()
      )}
    </div>
  );
}
