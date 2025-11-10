import { useState, useEffect } from 'react';
import { ChevronDown, Building2, Layers, MapPin, Map } from 'lucide-react';
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
    if (location.store) return <MapPin className="w-4 h-4 text-slate-600" />;
    if (location.company) return <Layers className="w-4 h-4 text-slate-600" />;
    if (location.concept) return <Building2 className="w-4 h-4 text-slate-600" />;
    return <Building2 className="w-4 h-4 text-slate-600" />;
  };

  const showConcepts = !userConceptId && !userCompanyId && !userStoreId;
  const showCompanies = (userConceptId && !userCompanyId && !userStoreId) || (location.concept && !location.company);
  const showStores = (userCompanyId && !userStoreId) || location.company;

  const hasMultipleLocations =
    (showConcepts && concepts.length > 1) ||
    (showCompanies && companies.length > 1) ||
    (showStores && stores.length > 1);

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
        {getCurrentIcon()}
        <span className="text-sm font-medium text-slate-900 max-w-[360px] truncate">
          {loading ? 'Loading...' : getCurrentDisplayName()}
        </span>
        {hasMultipleLocations && <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {hasMultipleLocations && (
        <div className="absolute top-full left-0 mt-1 w-[480px] bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all max-h-96 overflow-y-auto z-50">
          {showConcepts && concepts.map((concept) => (
            <button
              key={concept.id}
              onClick={() => setLocation({ concept })}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                location.concept?.id === concept.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{concept.name}</span>
            </button>
          ))}

          {showCompanies && companies.map((company) => (
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
              <Layers className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{company.name}</span>
            </button>
          ))}

          {showStores && stores.map((store) => (
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
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{store.name}</span>
            </button>
          ))}

          {(concepts.length > 0 || companies.length > 0 || stores.length > 0) && (
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
      )}
    </div>
  );
}
