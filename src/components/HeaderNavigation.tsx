import { useState, useEffect } from 'react';
import { ChevronDown, Building2, Layers, MapPin, Map, Sparkles, Search } from 'lucide-react';
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
  onOpenFullNavigator
}: HeaderNavigationProps) {
  const { location, setLocation } = useLocation();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    loadNavigationData();
  }, [userConceptId, userCompanyId, userStoreId, location]);

  const loadNavigationData = async () => {
    setLoading(true);

    if (userStoreId && location.company) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('company_id', location.company.id);

      if (storeData) setStores(storeData);
    } else if (userCompanyId && location.concept) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, concept_id')
        .eq('concept_id', location.concept.id);

      if (companyData) setCompanies(companyData);
    } else if (userConceptId) {
      const { data: conceptData } = await supabase
        .from('concepts')
        .select('id, name')
        .eq('id', userConceptId);

      if (conceptData) setConcepts(conceptData);
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
        .eq('concept_id', location.concept.id);

      if (companyData) setCompanies(companyData);
    } else if (location.company && !location.store) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .eq('company_id', location.company.id);

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

  const showConcepts = !userConceptId && !userCompanyId && !userStoreId;
  const showCompanies = (userConceptId && !userCompanyId && !userStoreId) || (location.concept && !location.company);
  const showStores = (userCompanyId && !userStoreId) || location.company;

  const hasMultipleLocations =
    (showConcepts && concepts.length > 1) ||
    (showCompanies && companies.length > 1) ||
    (showStores && stores.length > 1);

  // Filter logic
  const filterLower = filterQuery.toLowerCase();
  const filteredConcepts = concepts.filter(c => c.name.toLowerCase().includes(filterLower));
  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(filterLower));
  const filteredStores = stores.filter(s => s.name.toLowerCase().includes(filterLower));

  return (
    <div className="flex items-center gap-2">
      <div className="relative group">
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
          {getCurrentIcon()}
          <span className="text-sm font-medium text-slate-900 max-w-[360px] truncate">
            {loading ? 'Loading...' : getCurrentDisplayName()}
          </span>
          {hasMultipleLocations && <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {hasMultipleLocations && (
          <div className="absolute top-full left-0 mt-1 w-[960px] bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all max-h-[32rem] overflow-hidden z-50">
            {/* Filter Input */}
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

            {/* Scrollable Content */}
            <div className="max-h-80 overflow-y-auto py-1">
              {showConcepts && filteredConcepts.map((concept) => (
                <button
                  key={concept.id}
                  onClick={() => setLocation({ concept })}
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
                  onClick={() => setLocation({
                    concept: location.concept,
                    company
                  })}
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
                  onClick={() => setLocation({
                    concept: location.concept,
                    company: location.company,
                    store
                  })}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                    location.store?.id === store.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  {getLocationIcon('store', "w-4 h-4 flex-shrink-0")}
                  <span className="truncate">{store.name}</span>
                </button>
              ))}

              {(filteredConcepts.length > 0 || filteredCompanies.length > 0 || filteredStores.length > 0) && (
                <div className="border-t border-slate-200 mt-1 pt-1">
                  <button
                    onClick={onOpenFullNavigator}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 text-blue-600 font-medium"
                  >
                    <Map className="w-4 h-4 flex-shrink-0" />
                    <span>View Full Navigation</span>
                  </button>
                </div>
              )}
            </div>
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
    </div>
  );
}
